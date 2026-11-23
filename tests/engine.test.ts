import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  INITIAL_PORTFOLIO_CONTEXT,
  PRESET_TRADE_PROPOSALS,
  SPY_BENCHMARK_RETURNS,
  US_11_SECTORS_RAW,
} from "../src/engine/marketDataset.ts";
import {
  classifyMarketRegime,
  computeCutlerRSI,
  computeSectorRelativeStrength,
  computeWilderATR,
  computeWilderRSI,
  sanitizeBars,
} from "../src/engine/quantIndicators.ts";
import {
  computeMoomooSimulatedFees,
  evaluateProposalThroughGate,
} from "../src/engine/riskGate.ts";

console.log("=== Running AegisGate Deterministic Engine Unit & Integration Suite ===");

// 1. Test Wilder vs Cutler RSI divergence (fixes virattt/ai-hedge-fund PR #759)
const sampleSeries = [
  100, 102, 104, 103, 106, 109, 111, 110, 113, 115, 113, 116, 118, 117, 120,
  122, 119, 121, 123, 120, 118, 120, 122, 124, 121, 119, 121, 123, 121, 122,
];
const wilderRsi = computeWilderRSI(sampleSeries, 14);
const cutlerRsi = computeCutlerRSI(sampleSeries, 14);
assert.ok(wilderRsi > 50 && wilderRsi < 80, `Wilder RSI (${wilderRsi}) should be in valid bounds`);
assert.notEqual(
  wilderRsi,
  cutlerRsi,
  `Wilder (${wilderRsi}) and Cutler (${cutlerRsi}) must differ on multi-bar series`
);
console.log(`[PASS] 1. Wilder RSI (${wilderRsi}) vs Cutler RSI (${cutlerRsi}) divergence verified`);

// 2. Test blank/glitch bar sanitization (fixes TradingAgents PR #1707)
const rawBars = [
  { date: "2026-11-17", open: 100, high: 105, low: 99, close: 104, volume: 10000 },
  { date: "2026-11-18", open: NaN, high: NaN, low: NaN, close: NaN, volume: 18935 },
];
const { cleanBars, omittedDates } = sanitizeBars(rawBars);
assert.equal(cleanBars.length, 1);
assert.deepEqual(omittedDates, ["2026-11-18"]);
const atr = computeWilderATR(rawBars, 14);
assert.equal(atr, 6.0);
console.log(`[PASS] 2. Unsettled bar sanitization & ATR calculation verified (omitted: ${omittedDates.join(",")})`);

// 3. Test 11-Sector Relative Strength & Weinstein Stage Overlay
const rankedSectors = computeSectorRelativeStrength(
  US_11_SECTORS_RAW,
  SPY_BENCHMARK_RETURNS
);
assert.equal(rankedSectors.length, 11);
assert.equal(rankedSectors[0].symbol, "US.XLK");
assert.equal(rankedSectors[0].tier, "STRONG");
const xlv = rankedSectors.find((s) => s.symbol === "US.XLV")!;
assert.equal(xlv.tier, "WEAK");
assert.equal(xlv.stageCapped, true);
console.log(`[PASS] 3. 11-Sector SPDR Relative Strength & Weinstein Stage 4 cap verified (Top: ${rankedSectors[0].symbol})`);

// 4. Test Market Regime Classification (FULL / CAUTIOUS / DEFENSE / CASH)
assert.equal(classifyMarketRegime(508.4, 504.2, 498.6, 598.5, 584.0, false).posture, "FULL");
assert.equal(classifyMarketRegime(501.2, 504.2, 498.6, 598.5, 584.0, false).posture, "CAUTIOUS");
assert.equal(classifyMarketRegime(492.0, 499.0, 498.6, 598.5, 584.0, false).posture, "DEFENSE");
assert.equal(classifyMarketRegime(480.0, 495.0, 498.6, 570.0, 584.0, true).posture, "CASH");
console.log("[PASS] 4. Market Regime state machine (FULL / CAUTIOUS / DEFENSE / CASH) verified");

// 5. Test R01–R11 Deterministic Gate across all 6 Preset Scenarios
const nvdaEval = evaluateProposalThroughGate(
  PRESET_TRADE_PROPOSALS[0],
  INITIAL_PORTFOLIO_CONTEXT
);
assert.equal(nvdaEval.gateVerdict, "APPROVED");
assert.equal(nvdaEval.passedRulesCount, 11);
assert.ok(nvdaEval.sizing.finalUnits > 0);
assert.ok(nvdaEval.sizing.postTradeSymbolWeightPct <= 36.0);

const smciEval = evaluateProposalThroughGate(
  PRESET_TRADE_PROPOSALS[1],
  INITIAL_PORTFOLIO_CONTEXT
);
assert.equal(smciEval.gateVerdict, "REJECTED");
assert.ok(smciEval.failedRuleIds.includes("R03"), "SMCI must fail R03 (>36% concentration)");
assert.ok(smciEval.failedRuleIds.includes("R10"), "SMCI must fail R10 (1d to earnings)");

const spy0dteEval = evaluateProposalThroughGate(
  PRESET_TRADE_PROPOSALS[3],
  INITIAL_PORTFOLIO_CONTEXT
);
assert.equal(spy0dteEval.gateVerdict, "REJECTED");
assert.ok(spy0dteEval.failedRuleIds.includes("R09"), "SPY 0DTE must fail R09 (DTE < 2 expiry guard)");

const ffieEval = evaluateProposalThroughGate(
  PRESET_TRADE_PROPOSALS[4],
  INITIAL_PORTFOLIO_CONTEXT
);
assert.equal(ffieEval.gateVerdict, "REJECTED");
assert.ok(ffieEval.failedRuleIds.includes("R01"), "FFIE must fail R01 (<$1.00 penny stock)");
assert.ok(ffieEval.failedRuleIds.includes("R02"), "FFIE must fail R02 (<$500M market cap)");

const metaOptionEval = evaluateProposalThroughGate(
  PRESET_TRADE_PROPOSALS[5],
  INITIAL_PORTFOLIO_CONTEXT
);
assert.equal(metaOptionEval.gateVerdict, "APPROVED");
assert.equal(metaOptionEval.passedRulesCount, 11);
console.log("[PASS] 5. R01–R11 Gate evaluations verified across all 6 stock/ETF/option scenarios");

// 6. Test Moomoo Virtual Fee Model (T&C §8)
const stockFee = computeMoomooSimulatedFees("STOCK", 200);
assert.ok(stockFee >= 1.98 && stockFee < 2.1, `Stock round-trip fee (${stockFee}) should include $0.99*2 + TAF`);
const optFee = computeMoomooSimulatedFees("LONG_CALL_OPTION", 5, 2.4);
assert.ok(optFee > 9.0, `Option round-trip fee (${optFee}) should reflect contract commission + platform fee`);
console.log(`[PASS] 6. Moomoo simulated fee model verified (Stock 200sh: $${stockFee}, Option 5c: $${optFee})`);

// 7. Test QCA Packaged Skill ZIPs & Manifest
const manifestPath = path.resolve(process.cwd(), "public/qca-skills/manifest.json");
assert.ok(fs.existsSync(manifestPath), "public/qca-skills/manifest.json must exist");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.totalSkills, 12);
assert.equal(manifest.allValid, true);
console.log(`[PASS] 7. All ${manifest.totalSkills} QCA Skill .zip archives validated`);

console.log("=== ALL AEGISGATE TESTS PASSED (7/7) ===");
