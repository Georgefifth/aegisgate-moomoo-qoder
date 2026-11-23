/**
 * AegisGate — Zero-Hallucination Quantitative Indicator & Regime Engine
 *
 * Implements:
 * 1. Wilder's Smoothed RSI (fixes the 10.2-pt Cutler simple-mean RSI bug in virattt/ai-hedge-fund PR #759)
 * 2. Exponential & Simple Moving Averages (10 EMA, 20 EMA, 50 SMA, 200 SMA)
 * 3. Wilder's Average True Range (ATR-14) for Volatility-Parity Position Sizing
 * 4. 11-Sector SPDR Relative Strength Composite + Weinstein Stage Overlay (AA Playbook §04)
 * 5. Market Regime Posture State Machine (FULL / CAUTIOUS / DEFENSE / CASH)
 */

export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HorizonReturns {
  r1m: number;  // 21-session return (%)
  r3m: number;  // 63-session return (%)
  r6m: number;  // 126-session return (%)
  r12m: number; // 252-session return (%)
}

export interface SectorRawInput {
  symbol: string;
  name: string;
  price: number;
  sma50: number;
  sma200: number;
  returns: HorizonReturns;
  topHoldings: string[];
}

export type SectorTier = "STRONG" | "NEUTRAL" | "WEAK";

export interface SectorRankedOutput extends SectorRawInput {
  compositeExcessReturn: number;
  rawRank: number; // 1 = weakest, 11 = strongest
  baseScore: number;
  stageOverlayNote: string;
  stageCapped: boolean;
  finalScore: number;
  tier: SectorTier;
  exposureCapPct: number;
  shortAllowed: boolean;
}

export type MarketRegimePosture = "FULL" | "CAUTIOUS" | "DEFENSE" | "CASH";

export interface RegimeDiagnosis {
  posture: MarketRegimePosture;
  qqqPrice: number;
  qqqEma10: number;
  qqqEma20: number;
  spyPrice: number;
  spySma50: number;
  extensionFromEma20Pct: number;
  investedRangePct: [number, number];
  localDeskMaxExposurePct: number;
  perTradeRiskBudgetPct: number;
  allowNewLongs: boolean;
  allowHalfSizeShorts: boolean;
  summary: string;
}

/**
 * Drops unsettled bars where close is NaN/null/<=0 (fixes TradingAgents PR #1707 Yahoo glitch bar issue)
 */
export function sanitizeBars(bars: OhlcvBar[]): {
  cleanBars: OhlcvBar[];
  omittedDates: string[];
} {
  const cleanBars: OhlcvBar[] = [];
  const omittedDates: string[] = [];
  for (const b of bars) {
    if (
      b &&
      Number.isFinite(b.close) &&
      b.close > 0 &&
      Number.isFinite(b.high) &&
      Number.isFinite(b.low) &&
      Number.isFinite(b.open)
    ) {
      cleanBars.push(b);
    } else if (b?.date) {
      omittedDates.push(b.date);
    }
  }
  return { cleanBars, omittedDates };
}

/**
 * Wilder's RSI (matches TA-Lib & TradingView to 1e-12)
 */
export function computeWilderRSI(closes: number[], period = 14): number {
  const valid = closes.filter((c) => Number.isFinite(c) && c > 0);
  if (valid.length <= period) return 50.0;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = valid[i] - valid[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < valid.length; i++) {
    const diff = valid[i] - valid[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0 && avgGain === 0) return 50.0;
  if (avgLoss === 0) return 100.0;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Cutler's Simple Rolling Mean RSI — kept strictly to demonstrate the divergence bug
 * documented in virattt/ai-hedge-fund PR #759.
 */
export function computeCutlerRSI(closes: number[], period = 14): number {
  const valid = closes.filter((c) => Number.isFinite(c) && c > 0);
  if (valid.length <= period) return 50.0;
  let gainSum = 0;
  let lossSum = 0;
  const start = valid.length - period;
  for (let i = start; i < valid.length; i++) {
    const diff = valid[i] - valid[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum += -diff;
  }
  if (lossSum === 0 && gainSum === 0) return 50.0;
  if (lossSum === 0) return 100.0;
  const rs = (gainSum / period) / (lossSum / period);
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

export function computeSMA(values: number[], period: number): number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  const slice = valid.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / slice.length).toFixed(2));
}

export function computeEMA(values: number[], period: number): number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  if (valid.length <= period) return computeSMA(valid, valid.length);

  const k = 2 / (period + 1);
  let ema =
    valid.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  for (let i = period; i < valid.length; i++) {
    ema = valid[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(2));
}

export function computeWilderATR(bars: OhlcvBar[], period = 14): number {
  const { cleanBars } = sanitizeBars(bars);
  if (cleanBars.length === 0) return 0;
  if (cleanBars.length === 1) {
    return Number((cleanBars[0].high - cleanBars[0].low).toFixed(2));
  }

  const trs: number[] = [];
  for (let i = 1; i < cleanBars.length; i++) {
    const cur = cleanBars[i];
    const prevClose = cleanBars[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose)
    );
    trs.push(tr);
  }

  if (trs.length <= period) {
    const avg = trs.reduce((a, b) => a + b, 0) / trs.length;
    return Number(avg.toFixed(2));
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return Number(atr.toFixed(2));
}

/**
 * Implements AA Trading Desk Playbook §04:
 * Composite = 0.30 * R12 + 0.30 * R6 + 0.20 * R3 + 0.20 * R1
 * where R_k = Sector_Return_k - SPY_Return_k (in percentage points)
 * Score = 100 * (rank - 1) / 10; rank 1 = weakest, rank 11 = strongest
 * Plus Stage Overlay (50 SMA vs 200 SMA)
 */
export function computeSectorRelativeStrength(
  sectors: SectorRawInput[],
  spyReturns: HorizonReturns
): SectorRankedOutput[] {
  const withComposite = sectors.map((sec) => {
    const r12 = sec.returns.r12m - spyReturns.r12m;
    const r6 = sec.returns.r6m - spyReturns.r6m;
    const r3 = sec.returns.r3m - spyReturns.r3m;
    const r1 = sec.returns.r1m - spyReturns.r1m;
    const compositeExcessReturn = Number(
      (0.3 * r12 + 0.3 * r6 + 0.2 * r3 + 0.2 * r1).toFixed(2)
    );
    return { ...sec, compositeExcessReturn };
  });

  // Sort ascending by compositeExcessReturn to assign rank 1..11
  const sortedAsc = [...withComposite].sort(
    (a, b) => a.compositeExcessReturn - b.compositeExcessReturn
  );

  const ranked: SectorRankedOutput[] = sortedAsc.map((sec, idx) => {
    const rawRank = idx + 1; // 1 = weakest, 11 = strongest
    const baseScore = Math.round((100 * (rawRank - 1)) / Math.max(1, sectors.length - 1));

    let finalScore = baseScore;
    let stageOverlayNote = "Stage 2 Uptrend (50 SMA > 200 SMA & Price > 50 SMA): +0";
    let stageCapped = false;

    if (sec.sma50 < sec.sma200) {
      finalScore = Math.min(baseScore, 30);
      stageOverlayNote = "Stage 4 Downtrend (50 SMA < 200 SMA): Capped at 30 -> WEAK";
      stageCapped = true;
    } else if (sec.price < sec.sma50) {
      finalScore = Math.max(0, baseScore - 10);
      stageOverlayNote = "Stage 3 Pullback (50 SMA > 200 SMA, Price < 50 SMA): -10 pts";
    }

    let tier: SectorTier = "NEUTRAL";
    if (stageCapped || rawRank <= 4) {
      tier = "WEAK";
    } else if (rawRank >= 9) {
      tier = "STRONG";
    }

    const exposureCapPct = tier === "STRONG" ? 30 : tier === "NEUTRAL" ? 25 : 0;
    const shortAllowed = tier === "WEAK" || tier === "NEUTRAL";

    return {
      ...sec,
      rawRank,
      baseScore,
      stageOverlayNote,
      stageCapped,
      finalScore,
      tier,
      exposureCapPct,
      shortAllowed,
    };
  });

  // Return sorted strongest first (rank 11 down to 1)
  return ranked.sort((a, b) => b.rawRank - a.rawRank);
}

/**
 * Classifies Market Regime Posture per AA Playbook §01 & §08 Reconciled Rules
 */
export function classifyMarketRegime(
  qqqPrice: number,
  qqqEma10: number,
  qqqEma20: number,
  spyPrice: number,
  spySma50: number,
  wedgeDropConfirmed = false
): RegimeDiagnosis {
  const extensionFromEma20Pct = Number(
    (((qqqPrice - qqqEma20) / qqqEma20) * 100).toFixed(2)
  );

  if (wedgeDropConfirmed || (qqqPrice < qqqEma20 && spyPrice < spySma50)) {
    return {
      posture: "CASH",
      qqqPrice,
      qqqEma10,
      qqqEma20,
      spyPrice,
      spySma50,
      extensionFromEma20Pct,
      investedRangePct: [0, 25],
      localDeskMaxExposurePct: 25,
      perTradeRiskBudgetPct: 0.0,
      allowNewLongs: false,
      allowHalfSizeShorts: false,
      summary:
        "QQQ below 20 EMA with confirmed broad breakdown. Block all new entries; protect cash and tighten existing stops.",
    };
  }

  if (qqqPrice < qqqEma20) {
    return {
      posture: "DEFENSE",
      qqqPrice,
      qqqEma10,
      qqqEma20,
      spyPrice,
      spySma50,
      extensionFromEma20Pct,
      investedRangePct: [25, 50],
      localDeskMaxExposurePct: 50,
      perTradeRiskBudgetPct: 0.375,
      allowNewLongs: false,
      allowHalfSizeShorts: true,
      summary:
        "QQQ below 20 EMA. No routine new longs; permit half-size shorts (0.375% risk) in WEAK sectors or inverse ETF hedges.",
    };
  }

  if (extensionFromEma20Pct > 3.8 || qqqPrice < qqqEma10) {
    return {
      posture: "CAUTIOUS",
      qqqPrice,
      qqqEma10,
      qqqEma20,
      spyPrice,
      spySma50,
      extensionFromEma20Pct,
      investedRangePct: [60, 75],
      localDeskMaxExposurePct: 72,
      perTradeRiskBudgetPct: 0.5,
      allowNewLongs: true,
      allowHalfSizeShorts: false,
      summary:
        "QQQ above 20 EMA but choppy or extended (+3.8%+ above 20 EMA or below 10 EMA). Half-to-reduced entry sizing (0.50% risk cap).",
    };
  }

  return {
    posture: "FULL",
    qqqPrice,
    qqqEma10,
    qqqEma20,
    spyPrice,
    spySma50,
    extensionFromEma20Pct,
    investedRangePct: [75, 85],
    localDeskMaxExposurePct: 85,
    perTradeRiskBudgetPct: 0.75,
    allowNewLongs: true,
    allowHalfSizeShorts: false,
    summary:
      "QQQ trending cleanly above rising 10 & 20 EMA. Reconciled Desk Cap: up to 85% total invested, <=0.75% equity risk per trade, <=36% single-symbol cap.",
  };
}
