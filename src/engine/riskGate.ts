/**
 * AegisGate — Deterministic R01–R11 Pre-Trade Risk Gate & 3-Rung Limit Ladder Engine
 *
 * Enforces all Moomoo x Qoder AI Trading Agent Challenge rules & reconciled AA Desk SOPs
 * in zero-hallucination TypeScript code before any order reaches `moomoo sim`.
 */

import type { MarketRegimePosture, SectorTier } from "./quantIndicators.ts";

export type SgtSessionWindow =
  | "PRE_MARKET_1700_2230_SGT"
  | "REGULAR_HOURS_2230_0500_SGT"
  | "AFTER_HOURS_0500_0900_SGT"
  | "THANKSGIVING_CLOSED_NOV26"
  | "BLACK_FRIDAY_FLATTEN_CUTOFF";

export type AssetInstrumentType = "STOCK" | "ETF" | "INVERSE_ETF" | "LONG_CALL_OPTION" | "LONG_PUT_OPTION";

export type KellSetupName =
  | "01 // Reversal Extension"
  | "02 // Wedge Pop"
  | "03 // EMA Crossback"
  | "04 // Base n' Break"
  | "05 // CAN SLIM Pivot Breakout"
  | "06 // Buyable Gap-Up (Post-Earnings)"
  | "07 // Ignite Bar Continuation"
  | "08 // Volatility Contraction (VCP)"
  | "S // Short-Side Breakdown Mirror";

export interface AnomalySignals {
  technicalSignal: string;
  technicalScore: number; // 0..100
  capitalFlowSignal: string;
  netInflowUsdM: number;
  capitalFlowScore: number; // 0..100
  derivativesSignal: string;
  putCallRatio: number;
  ivRank: number;
  derivativesScore: number; // 0..100
  sentimentBullPct: number;
  sentimentSampleSize: number;
  headlineSummary: string;
  headlineSourceTime: string;
}

export interface TradeProposalInput {
  id: string;
  symbol: string; // e.g. "US.NVDA"
  companyName: string;
  sectorSymbol: string;
  sectorTier: SectorTier;
  instrumentType: AssetInstrumentType;
  side: "BUY" | "SELL_SHORT";
  orderType: "LIMIT" | "MARKET";
  setup: KellSetupName;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  bidPrice: number;
  askPrice: number;
  marketCapUsdM: number;
  avgDailyVolumeShares: number;
  barVolume5mShares: number;
  daysToEarnings: number;
  optionDte?: number;
  optionDelta?: number;
  optionContractPremium?: number;
  wilderRsi14: number;
  cutlerRsi14: number;
  ema10: number;
  ema20: number;
  atr14: number;
  requestedAllocationOverridePct?: number;
  anomalies: AnomalySignals;
  counterfactual5dOutcomePct: number; // Real subsequent move (%) to measure counterfactual saved drawdown or realized alpha
}

export interface PortfolioRuntimeContext {
  accountId: string;
  accountName: string;
  netAssetsUsd: number;
  cashUsd: number;
  buyingPowerUsd: number;
  currentInvestedUsd: number;
  distinctTickersHeld: number;
  existingSymbolNotionalUsd: Record<string, number>;
  currentOpenHeatPct: number;
  dailyPnlUsd: number;
  dailyPnlPct: number;
  peakDrawdownPct: number;
  ordersExecutedToday: number;
  regimePosture: MarketRegimePosture;
  sgtSessionWindow: SgtSessionWindow;
}

export interface RuleCheckResult {
  ruleId:
    | "R01"
    | "R02"
    | "R03"
    | "R04"
    | "R05"
    | "R06"
    | "R07"
    | "R08"
    | "R09"
    | "R10"
    | "R11";
  shortLabel: string;
  category: "ELIGIBILITY" | "CONCENTRATION" | "PORTFOLIO_HEAT" | "EXECUTION_TIMING";
  passed: boolean;
  measuredValue: string;
  thresholdValue: string;
  safetyMarginText: string;
  reasonIfFailed: string;
}

export interface LimitLadderRung {
  rung: 1 | 2 | 3;
  offsetMinutes: number;
  limitPrice: number;
  actionType: "INITIAL_SUBMIT" | "MODIFY_STEP_UP" | "ASK_CEILING_FINAL";
  cliCommand: string;
  note: string;
}

export interface DeterministicSizingResult {
  riskBudgetPct: number;
  riskBudgetUsd: number;
  perUnitRiskUsd: number;
  riskBasedUnits: number;
  concentrationCapUnits: number;
  volume20xCapUnits: number;
  finalUnits: number;
  unitLabel: "SHARES" | "CONTRACTS";
  notionalUsd: number;
  postTradeSymbolWeightPct: number;
  postTradeTotalInvestedPct: number;
  actualTradeRiskUsd: number;
  actualTradeRiskPctEquity: number;
  postTradePortfolioHeatPct: number;
  rewardToRiskRatio: number;
  expectedCommissionAndFeeUsd: number;
  overnightFinancingAnnualPct: number;
}

export interface GateEvaluationReport {
  proposal: TradeProposalInput;
  context: PortfolioRuntimeContext;
  evaluatedAtUtc: string;
  anomalyConvergenceScore: number;
  sizing: DeterministicSizingResult;
  rules: RuleCheckResult[];
  passedRulesCount: number;
  totalRulesCount: 11;
  failedRuleIds: string[];
  gateVerdict: "APPROVED" | "REJECTED";
  advisorRedTeamVerdict: "CONCUR_APPROVE" | "CAUTION_TRIM" | "VETO_REJECT";
  advisorRedTeamNote: string;
  limitLadder: LimitLadderRung[];
  stopEscalationSop: string;
  counterfactualImpactUsd: number;
}

/**
 * Computes Moomoo competition simulated fees (Handbook Moomoo Paper Trading T&C §8)
 * - Stocks: $0 commission + $0.99 platform fee/order + $0.000166/share TAF on sell (capped at $8.30)
 * - Options: $0.65/contract (>$0.10 premium) or $0.15/contract (<=$0.10), min $1.99/order
 *            + $0.30/contract platform fee + $0.00279 TAF + $0.015 regulatory fee
 */
export function computeMoomooSimulatedFees(
  instrumentType: AssetInstrumentType,
  units: number,
  optionPremium = 2.5
): number {
  if (units <= 0) return 0;
  if (
    instrumentType === "LONG_CALL_OPTION" ||
    instrumentType === "LONG_PUT_OPTION"
  ) {
    const perContractComm = optionPremium > 0.1 ? 0.65 : 0.15;
    const comm = Math.max(1.99, units * perContractComm);
    const platform = units * 0.3;
    const tafAndReg = units * (0.00279 + 0.015);
    // Round-trip entry + exit estimate
    return Number(((comm + platform + tafAndReg) * 2).toFixed(2));
  }
  const entryFee = 0.99;
  const exitTaf = Math.min(8.3, units * 0.000166);
  const exitFee = 0.99 + exitTaf;
  return Number((entryFee + exitFee).toFixed(2));
}

/**
 * Evaluates a trade proposal against all 11 deterministic competition & desk rules (R01-R11)
 */
export function evaluateProposalThroughGate(
  proposal: TradeProposalInput,
  context: PortfolioRuntimeContext
): GateEvaluationReport {
  const isOption =
    proposal.instrumentType === "LONG_CALL_OPTION" ||
    proposal.instrumentType === "LONG_PUT_OPTION";

  const hasValidSymbolFormat = /^[A-Z]{2}\.[A-Z0-9._-]+$/i.test(
    (proposal.symbol || "").trim()
  );
  const safeCliSymbol = hasValidSymbolFormat
    ? proposal.symbol.trim().toUpperCase()
    : "INVALID.SYMBOL";

  const finiteEntry =
    Number.isFinite(proposal.entryPrice) && proposal.entryPrice > 0
      ? proposal.entryPrice
      : 0;
  const finiteStop =
    Number.isFinite(proposal.stopPrice) && proposal.stopPrice >= 0
      ? proposal.stopPrice
      : 0;
  const finiteTarget =
    Number.isFinite(proposal.targetPrice) && proposal.targetPrice > 0
      ? proposal.targetPrice
      : 0;
  const finiteMcap =
    Number.isFinite(proposal.marketCapUsdM) && proposal.marketCapUsdM >= 0
      ? proposal.marketCapUsdM
      : 0;
  const finiteBarVol5m =
    Number.isFinite(proposal.barVolume5mShares) &&
    proposal.barVolume5mShares >= 0
      ? proposal.barVolume5mShares
      : 0;

  // 1. Determine regime-adjusted risk budget (%)
  const baseRiskBudgetPct =
    context.regimePosture === "FULL"
      ? 0.75
      : context.regimePosture === "CAUTIOUS"
      ? 0.5
      : context.regimePosture === "DEFENSE"
      ? 0.375
      : 0.0;

  const riskBudgetUsd = Number(
    ((context.netAssetsUsd * baseRiskBudgetPct) / 100).toFixed(2)
  );

  // 2. Per-unit risk
  const rawPriceStopDistance = Math.abs(finiteEntry - finiteStop);
  const perUnitRiskUsd = isOption
    ? Number(
        (
          (Number.isFinite(proposal.optionContractPremium) &&
          (proposal.optionContractPremium || 0) > 0
            ? proposal.optionContractPremium!
            : Math.max(0.01, finiteEntry)) * 100
        ).toFixed(2)
      )
    : Math.max(0.01, Number(rawPriceStopDistance.toFixed(4)));

  const riskBasedUnits =
    finiteEntry > 0 && perUnitRiskUsd > 0
      ? Math.floor(riskBudgetUsd / perUnitRiskUsd)
      : 0;

  // 3. Single-symbol 36% buffer cap (4% safety buffer below Moomoo's hard 40% ceiling)
  const existingNotional =
    context.existingSymbolNotionalUsd[proposal.symbol] || 0;
  const maxSymbolNotionalUsd = context.netAssetsUsd * 0.36;
  const remainingSymbolRoomUsd = Math.max(
    0,
    maxSymbolNotionalUsd - existingNotional
  );

  const unitNotionalMultiplier = isOption ? 100 : 1;
  const unitCostUsd =
    finiteEntry > 0
      ? (isOption
          ? proposal.optionContractPremium || finiteEntry
          : finiteEntry) * unitNotionalMultiplier
      : 0;

  const concentrationCapUnits =
    unitCostUsd > 0
      ? isOption
        ? Math.min(1000, Math.floor(remainingSymbolRoomUsd / unitCostUsd))
        : Math.floor(remainingSymbolRoomUsd / unitCostUsd)
      : 0;

  // 4. Moomoo 20x Market Volume Matching Cap (T&C §7: actual market volume * 20)
  const volume20xCapUnits = isOption
    ? finiteBarVol5m > 0
      ? 250
      : 0
    : finiteBarVol5m > 0
    ? Math.max(1, Math.floor(finiteBarVol5m * 20 * 0.25))
    : 0;

  // If user requested an explicit allocation override (e.g., to test >40% violation in What-If mode)
  let finalUnits = Math.max(
    0,
    Math.min(riskBasedUnits, concentrationCapUnits, volume20xCapUnits)
  );

  if (
    unitCostUsd > 0 &&
    proposal.requestedAllocationOverridePct &&
    proposal.requestedAllocationOverridePct > 0
  ) {
    const targetNotional =
      (context.netAssetsUsd * proposal.requestedAllocationOverridePct) / 100;
    finalUnits = Math.max(1, Math.floor(targetNotional / unitCostUsd));
  } else if (finalUnits === 0 && riskBasedUnits > 0 && volume20xCapUnits > 0) {
    // Keep riskBasedUnits for measurement if blocked by concentration cap so R03 shows the exact breach
    finalUnits = riskBasedUnits;
  }

  const notionalUsd = Number((finalUnits * unitCostUsd).toFixed(2));
  const postTradeSymbolNotional = existingNotional + notionalUsd;
  const postTradeSymbolWeightPct = Number(
    ((postTradeSymbolNotional / context.netAssetsUsd) * 100).toFixed(2)
  );
  const postTradeTotalInvestedPct = Number(
    (((context.currentInvestedUsd + notionalUsd) / context.netAssetsUsd) * 100).toFixed(2)
  );

  const actualTradeRiskUsd = Number((finalUnits * perUnitRiskUsd).toFixed(2));
  const actualTradeRiskPctEquity = Number(
    ((actualTradeRiskUsd / context.netAssetsUsd) * 100).toFixed(3)
  );
  const postTradePortfolioHeatPct = Number(
    (context.currentOpenHeatPct + actualTradeRiskPctEquity).toFixed(3)
  );

  const perShareReward = Math.abs(proposal.targetPrice - proposal.entryPrice);
  const rewardToRiskRatio = Number(
    (perShareReward / Math.max(0.01, rawPriceStopDistance)).toFixed(2)
  );

  const expectedCommissionAndFeeUsd = computeMoomooSimulatedFees(
    proposal.instrumentType,
    finalUnits,
    proposal.optionContractPremium
  );

  const overnightFinancingAnnualPct =
    proposal.side === "SELL_SHORT" ? 6.0 : 4.8;

  const sizing: DeterministicSizingResult = {
    riskBudgetPct: baseRiskBudgetPct,
    riskBudgetUsd,
    perUnitRiskUsd,
    riskBasedUnits,
    concentrationCapUnits,
    volume20xCapUnits,
    finalUnits,
    unitLabel: isOption ? "CONTRACTS" : "SHARES",
    notionalUsd,
    postTradeSymbolWeightPct,
    postTradeTotalInvestedPct,
    actualTradeRiskUsd,
    actualTradeRiskPctEquity,
    postTradePortfolioHeatPct,
    rewardToRiskRatio,
    expectedCommissionAndFeeUsd,
    overnightFinancingAnnualPct,
  };

  // Validate stop direction sanity
  const validStopDirection =
    proposal.side === "BUY"
      ? proposal.stopPrice < proposal.entryPrice
      : proposal.stopPrice > proposal.entryPrice;

  // --- Evaluate R01 through R11 ---

  // R01: Minimum Share Price >= $1.00 & Valid MARKET.CODE Symbol (Moomoo T&C §3.1)
  const r01Passed =
    hasValidSymbolFormat &&
    Number.isFinite(proposal.entryPrice) &&
    proposal.entryPrice >= 1.0;
  const r01: RuleCheckResult = {
    ruleId: "R01",
    shortLabel: "Share Price >= $1.00",
    category: "ELIGIBILITY",
    passed: r01Passed,
    measuredValue: Number.isFinite(proposal.entryPrice)
      ? `$${proposal.entryPrice.toFixed(2)}`
      : "NaN / Invalid",
    thresholdValue: ">= $1.00 USD (MARKET.CODE)",
    safetyMarginText: !hasValidSymbolFormat
      ? "INVALID SYMBOL FORMAT"
      : r01Passed
      ? `+$${(proposal.entryPrice - 1.0).toFixed(2)} above floor`
      : `-$${(1.0 - finiteEntry).toFixed(2)} penny stock violation`,
    reasonIfFailed: !hasValidSymbolFormat
      ? "Symbol violates Moomoo MARKET.CODE format or contains disallowed CLI characters."
      : "Moomoo Paper Trading T&C §3.1 prohibits trading stocks priced below USD 1.00.",
  };

  // R02: Market Cap >= $500M (Moomoo T&C §3.2)
  const r02Passed =
    Number.isFinite(proposal.marketCapUsdM) && proposal.marketCapUsdM >= 500;
  const r02: RuleCheckResult = {
    ruleId: "R02",
    shortLabel: "Market Cap >= $500M",
    category: "ELIGIBILITY",
    passed: r02Passed,
    measuredValue: !Number.isFinite(proposal.marketCapUsdM)
      ? "NaN / Invalid"
      : proposal.marketCapUsdM >= 1000
      ? `$${(proposal.marketCapUsdM / 1000).toFixed(1)}B`
      : `$${proposal.marketCapUsdM.toFixed(0)}M`,
    thresholdValue: ">= $500M USD",
    safetyMarginText: r02Passed
      ? `${(proposal.marketCapUsdM / 500).toFixed(1)}x minimum cap`
      : `Below $500M micro-cap floor`,
    reasonIfFailed:
      "Moomoo Paper Trading T&C §3.2 prohibits stocks/options with market cap below USD 500M.",
  };

  // R03: Single-Stock Concentration Cap <= 36% buffer (40% hard competition limit, T&C §3.5 & Slide 19)
  const r03Passed = isOption
    ? finalUnits <= 1000 && postTradeSymbolWeightPct <= 36.0
    : postTradeSymbolWeightPct <= 36.0;
  const r03: RuleCheckResult = {
    ruleId: "R03",
    shortLabel: "Single-Ticker Cap <= 36%",
    category: "CONCENTRATION",
    passed: r03Passed,
    measuredValue: `${postTradeSymbolWeightPct.toFixed(2)}% ($${postTradeSymbolNotional.toLocaleString()})`,
    thresholdValue: "<= 36.0% (40% Hard Cap)",
    safetyMarginText: r03Passed
      ? `${(40.0 - postTradeSymbolWeightPct).toFixed(2)}% buffer to 40% ceiling`
      : `Exceeds 36% desk cap (+${(postTradeSymbolWeightPct - 36.0).toFixed(2)}%)`,
    reasonIfFailed:
      "Exceeds single-ticker concentration ceiling (36% desk guardrail / 40% Moomoo hard limit).",
  };

  // R04: Multi-Ticker Diversification (>= 3 distinct tickers for full capital deployment, T&C §3.5)
  const newTickerCount =
    existingNotional > 0
      ? context.distinctTickersHeld
      : context.distinctTickersHeld + 1;
  const r04Passed =
    postTradeTotalInvestedPct <= 72.0 || newTickerCount >= 3;
  const r04: RuleCheckResult = {
    ruleId: "R04",
    shortLabel: ">= 3 Ticker Diversification",
    category: "CONCENTRATION",
    passed: r04Passed,
    measuredValue: `${newTickerCount} tickers @ ${postTradeTotalInvestedPct.toFixed(1)}% invested`,
    thresholdValue: ">= 3 tickers if >72% deployed",
    safetyMarginText: r04Passed
      ? `${newTickerCount} distinct holdings active`
      : `Only ${newTickerCount} tickers for ${postTradeTotalInvestedPct.toFixed(1)}% deployment`,
    reasonIfFailed:
      "Deploying >72% capital across fewer than 3 distinct tickers violates the 3-ticker diversification mandate.",
  };

  // R05: Portfolio Open Heat Cap <= 6.0% (AA Playbook §01 & §02)
  const r05Passed = postTradePortfolioHeatPct <= 6.0;
  const r05: RuleCheckResult = {
    ruleId: "R05",
    shortLabel: "Portfolio Heat <= 6.0%",
    category: "PORTFOLIO_HEAT",
    passed: r05Passed,
    measuredValue: `${postTradePortfolioHeatPct.toFixed(2)}%`,
    thresholdValue: "<= 6.00% Open Stop Heat",
    safetyMarginText: r05Passed
      ? `${(6.0 - postTradePortfolioHeatPct).toFixed(2)}% heat capacity remaining`
      : `+${(postTradePortfolioHeatPct - 6.0).toFixed(2)}% over 6% heat ceiling`,
    reasonIfFailed:
      "Aggregate dollar risk across open stops exceeds the 6.0% Portfolio Heat ceiling.",
  };

  // R06: Per-Trade Risk Budget <= 0.75% & Valid Structural Stop (AA Playbook §08 Reconciled)
  const r06Passed =
    validStopDirection &&
    actualTradeRiskPctEquity <= Math.max(0.75, baseRiskBudgetPct + 0.01) &&
    rewardToRiskRatio >= 1.5;
  const r06: RuleCheckResult = {
    ruleId: "R06",
    shortLabel: "Trade Risk <= 0.75% & R>=1.5",
    category: "PORTFOLIO_HEAT",
    passed: r06Passed,
    measuredValue: `${actualTradeRiskPctEquity.toFixed(2)}% ($${actualTradeRiskUsd.toFixed(0)}) · ${rewardToRiskRatio}R`,
    thresholdValue: `<= ${baseRiskBudgetPct.toFixed(2)}% risk · >= 1.5R`,
    safetyMarginText: !validStopDirection
      ? "INVALID STOP DIRECTION"
      : r06Passed
      ? `Positive expectancy (+${rewardToRiskRatio}R)`
      : `Risk ${actualTradeRiskPctEquity.toFixed(2)}% or R-multiple ${rewardToRiskRatio}R out of bounds`,
    reasonIfFailed: !validStopDirection
      ? "Structural stop is on the wrong side of entry price."
      : `Per-trade risk (${actualTradeRiskPctEquity.toFixed(2)}%) exceeds reconciled desk cap (${baseRiskBudgetPct.toFixed(2)}%) or R-multiple (${rewardToRiskRatio}R) < 1.5R.`,
  };

  // R07: Daily Drawdown Kill-Switch (< 2.0% daily loss & < 10% peak drawdown, AA Playbook §05)
  const r07Passed =
    context.dailyPnlPct > -2.0 &&
    context.peakDrawdownPct > -10.0 &&
    (context.regimePosture !== "DEFENSE" || proposal.side === "SELL_SHORT" || proposal.instrumentType === "INVERSE_ETF") &&
    context.regimePosture !== "CASH";
  const r07: RuleCheckResult = {
    ruleId: "R07",
    shortLabel: "Drawdown & Regime Gate",
    category: "PORTFOLIO_HEAT",
    passed: r07Passed,
    measuredValue: `Day ${context.dailyPnlPct >= 0 ? "+" : ""}${context.dailyPnlPct.toFixed(2)}% · Regime ${context.regimePosture}`,
    thresholdValue: "Day > -2.0% · Peak > -10.0%",
    safetyMarginText: r07Passed
      ? `${(2.0 + context.dailyPnlPct).toFixed(2)}% buffer to -2% daily halt`
      : `KILL-SWITCH TRIPPED (${context.regimePosture} / Day ${context.dailyPnlPct.toFixed(2)}%)`,
    reasonIfFailed:
      context.dailyPnlPct <= -2.0
        ? "Daily loss >= 2.0% kill-switch active: all new entries halted for the session."
        : `Regime posture ${context.regimePosture} blocks new ${proposal.side} exposure.`,
  };

  // R08: Daily Executed Order Allowance < 200 orders/day & 20x Matching Volume > 0 (Moomoo T&C §3.3 & §7)
  const r08Passed =
    context.ordersExecutedToday < 190 &&
    volume20xCapUnits > 0 &&
    finalUnits > 0;
  const r08: RuleCheckResult = {
    ruleId: "R08",
    shortLabel: "Order Count < 190/200",
    category: "EXECUTION_TIMING",
    passed: r08Passed,
    measuredValue: `${context.ordersExecutedToday} / 200 orders · 20xVol=${volume20xCapUnits}`,
    thresholdValue: "< 190 orders · 5mVol > 0",
    safetyMarginText:
      volume20xCapUnits <= 0
        ? "ZERO MATCHING VOLUME (T&C §7)"
        : r08Passed
        ? `${200 - context.ordersExecutedToday} orders remaining today`
        : `Order quota exhausted (${context.ordersExecutedToday}/200)`,
    reasonIfFailed:
      volume20xCapUnits <= 0
        ? "Moomoo T&C §7 requires non-zero market volume for order matching (barVolume5mShares is 0)."
        : "Approaching Moomoo's 200 executed orders/day ceiling; remaining slots reserved for protective exits.",
  };

  // R09: Option Expiry & Auto-Exercise Protection (Moomoo T&C §5 & Slide 21)
  const dte = proposal.optionDte ?? 99;
  const r09Passed = !isOption || (dte >= 2 && (proposal.optionDelta ?? 0.75) >= 0.6);
  const r09: RuleCheckResult = {
    ruleId: "R09",
    shortLabel: "Option Expiry DTE >= 2d",
    category: "EXECUTION_TIMING",
    passed: r09Passed,
    measuredValue: isOption
      ? `${dte} DTE · Delta ${(proposal.optionDelta ?? 0.75).toFixed(2)}`
      : "N/A (Equity/ETF — No Expiry)",
    thresholdValue: "DTE >= 2d · Delta 0.60–0.85",
    safetyMarginText: !isOption
      ? "Zero auto-exercise delivery risk"
      : r09Passed
      ? `${dte} days buffer before ITM exercise`
      : `LETHAL ${dte} DTE AUTO-EXERCISE LIQUIDATION RISK`,
    reasonIfFailed:
      "Moomoo T&C §5 auto-exercises ITM options at expiry close, triggering forced margin liquidation. Options with DTE < 2 are blocked.",
  };

  // R10: Earnings Catalyst Buffer > 2 trading days (AA Playbook §02)
  const isPostEarningsBgu =
    proposal.setup === "06 // Buyable Gap-Up (Post-Earnings)";
  const r10Passed = isPostEarningsBgu || proposal.daysToEarnings > 2;
  const r10: RuleCheckResult = {
    ruleId: "R10",
    shortLabel: "Earnings Buffer > 2 Days",
    category: "EXECUTION_TIMING",
    passed: r10Passed,
    measuredValue: isPostEarningsBgu
      ? "Post-Earnings BGU Catalyst"
      : `${proposal.daysToEarnings} trading days to ER`,
    thresholdValue: "> 2 trading days (or BGU)",
    safetyMarginText: r10Passed
      ? `Safe from binary overnight ER gap`
      : `Earnings in ${proposal.daysToEarnings}d — binary gamble blocked`,
    reasonIfFailed:
      "AA Trading Desk §02 prohibits holding or entering non-BGU setups within 2 trading days of an earnings release.",
  };

  // R11: SGT 3-Session & Thanksgiving/Black Friday Holiday Guard (Briefing Slide 8 & 21)
  const isExtendedHours =
    context.sgtSessionWindow === "PRE_MARKET_1700_2230_SGT" ||
    context.sgtSessionWindow === "AFTER_HOURS_0500_0900_SGT";
  const isHolidayBlocked =
    context.sgtSessionWindow === "THANKSGIVING_CLOSED_NOV26" ||
    context.sgtSessionWindow === "BLACK_FRIDAY_FLATTEN_CUTOFF";
  const extendedMarketOrderViolation =
    isExtendedHours && proposal.orderType === "MARKET";
  const extendedOptionsViolation = isExtendedHours && isOption;

  const r11Passed =
    !isHolidayBlocked &&
    !extendedMarketOrderViolation &&
    !extendedOptionsViolation;

  const r11: RuleCheckResult = {
    ruleId: "R11",
    shortLabel: "SGT Session & Holiday Guard",
    category: "EXECUTION_TIMING",
    passed: r11Passed,
    measuredValue: `${context.sgtSessionWindow.replace(/_/g, " ")} · ${proposal.orderType}`,
    thresholdValue: "RTH or Limit-Only Ext · Holiday Flatten",
    safetyMarginText: r11Passed
      ? `Session-isolated ${proposal.orderType} routing OK`
      : isHolidayBlocked
      ? "HOLIDAY CUTOFF / FLATTEN ACTIVE"
      : extendedOptionsViolation
      ? "OPTIONS INELIGIBLE IN EXTENDED HOURS"
      : "MARKET ORDERS BLOCKED IN EXTENDED HOURS",
    reasonIfFailed: isHolidayBlocked
      ? "Thanksgiving closure (Nov 26) or Black Friday 01:45 AM SGT flatten timer active (Briefing Slide 8 A.I.M)."
      : extendedOptionsViolation
      ? "US Options cannot trade in Pre-Market/After-Hours sessions."
      : "Briefing Slide 8 & 21 require Limit orders only during Pre-Market (17:00 SGT) and After-Hours (05:00 SGT) to prevent wide-spread slippage.",
  };

  const rules: RuleCheckResult[] = [
    r01,
    r02,
    r03,
    r04,
    r05,
    r06,
    r07,
    r08,
    r09,
    r10,
    r11,
  ];

  const passedRulesCount = rules.filter((r) => r.passed).length;
  const failedRuleIds = rules.filter((r) => !r.passed).map((r) => r.ruleId);
  const gateVerdict = failedRuleIds.length === 0 ? "APPROVED" : "REJECTED";

  // Compute 3-Signal Anomaly Convergence Score (0..100)
  const anomalyConvergenceScore = Math.round(
    0.35 * proposal.anomalies.technicalScore +
      0.35 * proposal.anomalies.capitalFlowScore +
      0.3 * proposal.anomalies.derivativesScore
  );

  // Advisor Red-Team Evaluation
  let advisorRedTeamVerdict: "CONCUR_APPROVE" | "CAUTION_TRIM" | "VETO_REJECT" =
    "CONCUR_APPROVE";
  let advisorRedTeamNote = `3-Signal Anomaly Convergence is ${anomalyConvergenceScore}/100 with Wilder RSI ${proposal.wilderRsi14} (vs Cutler ${proposal.cutlerRsi14}). All R01–R11 deterministic boundaries satisfied.`;

  if (gateVerdict === "REJECTED") {
    advisorRedTeamVerdict = "VETO_REJECT";
    advisorRedTeamNote = `VETOED by deterministic gate (${failedRuleIds.join(", ")}). ${rules
      .filter((r) => !r.passed)
      .map((r) => r.reasonIfFailed)
      .join(" ")}`;
  } else if (
    proposal.wilderRsi14 > 72 ||
    Math.abs(proposal.wilderRsi14 - proposal.cutlerRsi14) >= 4
  ) {
    advisorRedTeamVerdict = "CAUTION_TRIM";
    advisorRedTeamNote = `Approved with caution: Wilder RSI is ${proposal.wilderRsi14} (note Cutler simple-mean RSI would misread ${proposal.cutlerRsi14}). Use strict 3-rung limit laddering and never chase above the ask ceiling.`;
  }

  // Generate 3-Rung Limit-Order Ladder (Briefing Slide 32)
  const midPrice = Number(
    ((proposal.bidPrice + proposal.askPrice) / 2).toFixed(2)
  );
  const stepPrice = Number(
    Math.min(
      proposal.askPrice,
      (midPrice + (proposal.askPrice - midPrice) * 0.5).toFixed(2) as unknown as number
    ).toFixed(2)
  );
  const askCeiling = Number(proposal.askPrice.toFixed(2));
  const cliVerb = proposal.side === "BUY" ? "buy" : "sell";

  const limitLadder: LimitLadderRung[] = [
    {
      rung: 1,
      offsetMinutes: 0,
      limitPrice: midPrice,
      actionType: "INITIAL_SUBMIT",
      cliCommand: `moomoo sim order ${cliVerb} ${safeCliSymbol} ${sizing.finalUnits} --account ${context.accountId} --market US --type limit --price ${midPrice.toFixed(2)} --format json`,
      note: "Submit initial limit at NBBO Midpoint; check fill status at T+5m.",
    },
    {
      rung: 2,
      offsetMinutes: 5,
      limitPrice: stepPrice,
      actionType: "MODIFY_STEP_UP",
      cliCommand: `moomoo sim order modify <ORDER_ID> --account ${context.accountId} --market US --qty ${sizing.finalUnits} --price ${stepPrice.toFixed(2)} --format json`,
      note: "If unfilled or partially filled (<20x bar volume), walk limit +50% toward Ask.",
    },
    {
      rung: 3,
      offsetMinutes: 10,
      limitPrice: askCeiling,
      actionType: "ASK_CEILING_FINAL",
      cliCommand: `moomoo sim order modify <ORDER_ID> --account ${context.accountId} --market US --qty ${sizing.finalUnits} --price ${askCeiling.toFixed(2)} --format json`,
      note: "Hard ceiling at current Ask. Cancel remaining unfilled balance at T+15m (no chasing).",
    },
  ];

  // Counterfactual Impact USD:
  // If REJECTED and counterfactual5dOutcomePct is negative (for BUY), the gate SAVED that dollar loss!
  const signedMovePct =
    proposal.side === "BUY"
      ? proposal.counterfactual5dOutcomePct
      : -proposal.counterfactual5dOutcomePct;
  const counterfactualImpactUsd = Number(
    ((notionalUsd * signedMovePct) / 100 - expectedCommissionAndFeeUsd).toFixed(2)
  );

  const stopEscalationSop = `Because Moomoo Paper API supports Limit/Market orders rather than resting broker stop orders (Playbook §05), AegisGate checks structural stop ($${proposal.stopPrice.toFixed(2)}) every 5m cycle. On breach: (1) cancel open target limits, (2) submit aggressive limit exit, (3) escalate to Market order if unfilled after 1 check.`;

  return {
    proposal,
    context,
    evaluatedAtUtc: new Date().toISOString(),
    anomalyConvergenceScore,
    sizing,
    rules,
    passedRulesCount,
    totalRulesCount: 11,
    failedRuleIds,
    gateVerdict,
    advisorRedTeamVerdict,
    advisorRedTeamNote,
    limitLadder,
    stopEscalationSop,
    counterfactualImpactUsd,
  };
}
