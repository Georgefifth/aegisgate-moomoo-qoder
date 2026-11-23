# Stage 3.5 — Real-World Validation & Competitor Benchmark Report

**Product:** AegisGate — Deterministic `R01–R11` Multi-Agent Trading, Risk Auditing & Counterfactual Control Plane (2026 Moomoo × Qoder AI Trading Agent Challenge)  
**Validation Runner:** `scripts/run-aegis-validation.ts` (`npm run validate:strategy`)  
**Initial Raw Results (Preserved):** `evidence/stage-3.5-validation/initial-results.json` (`22/25` — `88.0%`)  
**Post-Fix Regression Results:** `evidence/stage-3.5-validation/final-results.json` (`25/25` — `100.0%`)  
**External Real-World Datasets:** `evidence/stage-3.5-validation/datasets/` (`19` real 1-year Yahoo Finance US Equity & SPDR Sector ETF datasets, `4,769` settled daily OHLCV bars, checksums in `SHA256SUMS.txt`)  
**Overall Verdict:** **PASS**

---

## 1. Validation Objectives & Scope

Rather than testing only synthetic happy-path examples, we evaluated AegisGate against **4,769 real daily US market bars (Nov 2025 – Nov 2026)** and reproduced real failure modes from leading open-source AI trading frameworks (`virattt/ai-hedge-fund` PR #759 and `TauricResearch/TradingAgents` PR #1707, Issue #1704).

Capabilities evaluated:
1. **Mathematical Accuracy vs. Open-Source Baselines:** Wilder-smoothed RSI, 10/20 EMA, 50/200 SMA, and Wilder ATR-14 against Cutler simple-mean RSI (`ai-hedge-fund` PR #759) and unsettled NaN session bars (`TradingAgents` PR #1707).
2. **Cross-Sector & Macro Regime Classification:** 11 US SPDR Sector ETFs (`XLK`, `XLC`, `XLY`, `XLF`, `XLI`, `XLV`, `XLP`, `XLE`, `XLU`, `XLRE`, `XLB`) ranked against `SPY` with Weinstein 50/200 SMA stage overlays, plus `QQQ` 10/20 EMA regime classification across 201 real sessions.
3. **Out-of-Sample Risk-Adjusted Performance:** 190-session rolling multi-ticker test comparing **AegisGate (`R01–R11` Guarded)** vs. **Ungated Cutler Baseline** across `NVDA`, `PLTR`, `META`, `AVGO`, `SMCI`, and `TSLA`.
4. **Boundary, Negative & Adversarial Resilience:** Zero-volume illiquidity traps (`barVolume5mShares = 0`), CLI flag injection (`--execute 999`), micro-stop infinite-leverage attacks, and `NaN`/`Infinity` payload poisoning.

---

## 2. External Real-World Data Sources & Checksums

All 19 external datasets were fetched from the Yahoo Finance v8 Chart API (`https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?range=1y&interval=1d`) on `2026-11-23` and verified via SHA-256 (`evidence/stage-3.5-validation/datasets/SHA256SUMS.txt`):

| Dataset File | Asset Class | Trading Bars | Date Range | SHA-256 Prefix | Ground Truth Purpose |
|---|---|---|---|---|---|
| `NVDA_yahoo_1y.json`, `PLTR_yahoo_1y.json`, `META_yahoo_1y.json`, `AVGO_yahoo_1y.json`, `SMCI_yahoo_1y.json`, `TSLA_yahoo_1y.json` | 6 US Large/High-Beta Equities | 1,506 bars (251 each) | `2025-11-21` to `2026-11-20` | `ccd062d0...`, `31b63052...`, `c498fd8a...`, `46bf88cf...`, `25bf3edc...`, `b2212f13...` | Wilder vs. Cutler RSI divergence benchmark & 190-day out-of-sample rolling backtest |
| `SPY_yahoo_1y.json`, `QQQ_yahoo_1y.json` | 2 US Index Benchmark ETFs | 502 bars (251 each) | `2025-11-21` to `2026-11-20` | `dd4ffe65...`, `2ec4328a...` | `QQQ` 10/20 EMA & `SPY` 50 SMA Market Regime state machine (`FULL`/`CAUTIOUS`/`DEFENSE`/`CASH`) |
| `XLK`, `XLC`, `XLY`, `XLF`, `XLI`, `XLV`, `XLP`, `XLE`, `XLU`, `XLRE`, `XLB` (`*_yahoo_1y.json`) | All 11 US S&P 500 SPDR Sector ETFs | 2,761 bars (251 each) | `2025-11-21` to `2026-11-20` | See `SHA256SUMS.txt` | 11-Sector Relative Strength composite (`0.30*R12 + 0.30*R6 + 0.20*R3 + 0.20*R1`) + Weinstein 50/200 SMA stage cap |
| `MoomooOpen/moomoo-agent-hub` (Commit `9e45546`) | 11 Official Moomoo Skills + 1 Custom AegisGate Skill | 12 `.zip` archives | Retrieved `2026-11-23` | Verified via `zipfile.testzip()` | Qoder Cloud Agents (`qca`) skill schema validation (`https://docs.qoder.com/cloud-agents/api/skills/schemas.md`) |

---

## 3. Initial Run vs. Post-Fix Regression Summary

We froze the 25-case validation matrix before running against the Stage 2 codebase:

| Difficulty Tier | Total Cases | Initial Run (`initial-results.json`) | Post-Fix Run (`final-results.json`) | Notes |
|---|---|---|---|---|
| **BASIC** | 6 | 6 / 6 PASS | **6 / 6 PASS** | Real 1Y indicator math, 11-Sector RS, and 201-session `QQQ` regime state machine |
| **INTERMEDIATE** | 5 | 5 / 5 PASS | **5 / 5 PASS** | Stock & 75-DTE Option sizing, Cutler RSI flip benchmark, `R04` 3-ticker diversification, `R07` `-2.00%` kill-switch |
| **ADVANCED** | 4 | 4 / 4 PASS | **4 / 4 PASS** | 190-day out-of-sample backtest vs. Ungated Cutler baseline, 12-ZIP binary audit, margin financing attribution, 1,000-eval throughput |
| **EDGE** | 4 | 3 / 4 PASS *(1 Fail)* | **4 / 4 PASS** | Initial run caught `VAL-EDGE-ZERO-5M-VOLUME` (`barVolume5mShares = 0` allowed 1 share); fixed in `src/engine/riskGate.ts` |
| **NEGATIVE** | 3 | 3 / 3 PASS | **3 / 3 PASS** | Sub-$1/$500M penny stock (`R01/R02`), 0DTE option auto-exercise (`R09`), 1-day pre-earnings + 41.5% concentration (`R03/R10`) |
| **ADVERSARIAL** | 3 | 1 / 3 PASS *(2 Fails)* | **3 / 3 PASS** | Initial run caught `VAL-ADVERSARIAL-CLI-INJECTION` (unsanitized symbol in direct engine call) & `VAL-ADVERSARIAL-NAN-INFINITY` (`NaN` propagation in `Math.max(0.01, NaN)`); both fixed in `src/engine/riskGate.ts` |
| **TOTAL** | **25** | **22 / 25 (88.0%)** | **25 / 25 (100.0%)** | All 3 boundary/adversarial defects fixed and verified with zero regressions |

---

## 4. Key Empirical & Competitor Benchmark Findings

### 4.1 Competitor Benchmark 1: Wilder RSI vs. `virattt/ai-hedge-fund` Cutler RSI (`VAL-INT-CUTLER-BUG-BENCHMARK`)
- Across **1,386 real daily bars** on `NVDA`, `PLTR`, `SMCI`, `TSLA`, `META`, and `AVGO`:
  - **Maximum Single-Bar Divergence:** **29.22 RSI points** on `TSLA` (`2026-08-18`), and **8.34 RSI points** on `META` (`2026-11-20`, where Wilder RSI is `30.26` while Cutler RSI reads `38.60`).
  - **False Threshold Flips Prevented:** **235 bars** (`16.96%` of all trading days) where Cutler's simple rolling average fell on the opposite side of the standard `30` (oversold) or `70` (overbought) threshold compared to Wilder's exponential smoothing.

### 4.2 Competitor Benchmark 2: 190-Day Out-of-Sample Rolling Backtest (`VAL-ADV-BACKTEST-VS-UNGATED`)
Evaluated across **190 real out-of-sample trading days** on the 6 high-beta US tech equities (`NVDA`, `PLTR`, `META`, `AVGO`, `SMCI`, `TSLA`) including Moomoo's `$0.99/order` platform fee:

| Metric | Ungated Cutler Baseline (No Regime Gate, Cutler RSI, No ATR Cap) | AegisGate Guarded (`R01–R11` + `QQQ` 20-EMA Regime Gate + Wilder RSI + ATR Cap) | Empirical Advantage |
|---|---|---|---|
| **Cumulative Return (%)** | `-8.85%` (`$91,150`) | **`+0.32%` (`$100,320`)** | **`+9.17%` outperformance** during a volatile tech drawdown period |
| **Annualized Sharpe Ratio** | `-0.31` | **`+0.09`** | Positive risk-adjusted return vs. negative Sharpe |
| **Maximum Drawdown (%)** | `-27.22%` | **`-7.97%`** | **3.4x lower maximum drawdown** (`19.25` percentage points of drawdown prevented) |
| **High-Risk Entries Blocked** | `0` | **`275` entries vetoed** | Blocked entries when `QQQ < 20 EMA` (`DEFENSE`/`CASH` regimes: 101 out of 201 sessions) or when single-stock `ATR% > 5.2%` |

### 4.3 Competitor Benchmark 3: Execution Latency vs. Multi-Agent LLM Debate (`VAL-ADV-BATCH-THROUGHPUT`)
- **`TauricResearch/TradingAgents` (Issue #1704):** Multi-round LLM bull/bear/risk debates require 15–45 seconds per symbol, causing missed candle-close fills.
- **AegisGate Deterministic `R01–R11` Gate:** Executed **1,000 full 11-rule + 3-rung limit-ladder evaluations in `6.58 ms`** (**`0.0066 ms` per evaluation**), more than **1,000,000x faster** than conversational LLM risk gating and consuming **zero QCA credits** for deterministic rule checks.

---

## 5. Failure Analysis & Fixes Applied (`initial-results.json` $\rightarrow$ `final-results.json`)

1. **`VAL-EDGE-ZERO-5M-VOLUME` (Business Logic Boundary Defect — Fixed):**
   - **Cause:** `Math.max(1, Math.floor(proposal.barVolume5mShares * 20 * 0.25))` defaulted to `1` share even when `barVolume5mShares === 0`, and fallback logic reassigned `finalUnits = riskBasedUnits`.
   - **Fix:** In `src/engine/riskGate.ts`, set `volume20xCapUnits = 0` when `barVolume5mShares <= 0` and updated `R08` to explicitly fail with `"ZERO MATCHING VOLUME (T&C §7)"` when `volume20xCapUnits <= 0`.
2. **`VAL-ADVERSARIAL-CLI-INJECTION` (Input Sanitization Defect — Fixed):**
   - **Cause:** While the React UI validated `symbolInput`, calling `evaluateProposalThroughGate` directly with `symbol: "US.NVDA --execute 999 --account LIVE; rm -rf /"` interpolated the raw string into `cliCommand` without failing `R01`.
   - **Fix:** Added `/^[A-Z]{2}\.[A-Z0-9._-]+$/i` validation inside `evaluateProposalThroughGate` (`R01` fails on malformed symbols) and sanitized `safeCliSymbol` before constructing `cliCommand`.
3. **`VAL-ADVERSARIAL-NAN-INFINITY` (Numeric Poisoning Defect — Fixed):**
   - **Cause:** Passing `entryPrice: NaN` caused `Math.max(0.01, unitCostUsd)` to return `NaN` in JavaScript (`Math.max(0.01, NaN)` is `NaN`), propagating `NaN` into `finalUnits`.
   - **Fix:** Added explicit `Number.isFinite` guards (`finiteEntry`, `finiteStop`, `finiteTarget`, `finiteMcap`, `finiteBarVol5m`) at the top of `evaluateProposalThroughGate` so corrupted upstream payloads safely yield `finalUnits = 0` and `gateVerdict = "REJECTED"`.

---

## 6. Known Boundaries & Honest Limitations

1. **Historical Options Backtesting:** As confirmed in the official Moomoo × Qoder FAQ (line 911), the Moomoo MCP does not yet provide historical options chain time-series data. Therefore, AegisGate validates options rules (`R09` `DTE >= 2`, `Delta >= 0.60`, and full-premium risk sizing) on current/snapshot option contracts rather than claiming a multi-year historical options backtest.
2. **Broker OAuth Boundary:** Live order submission to the Moomoo competition account requires the participant's authenticated `moomoo` CLI OAuth session or QCA Vault (`https://mcp.moomoo.com/mcp`), which is intentionally kept on the user's machine/QCA Vault and never exposed in browser code.

---

## 7. Final Validation Verdict: **PASS**

All 25 real-world, boundary, negative, and adversarial validation cases pass (`100%`), backed by 19 real Yahoo Finance market datasets (`4,769` daily bars), preserved initial failure logs (`initial-results.json`), and verified post-fix regression results (`final-results.json`). The product's claims are 100% grounded in reproducible evidence and ready for Stage 4 Demo Video & Deck production.
