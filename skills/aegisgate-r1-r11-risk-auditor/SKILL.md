---
name: aegisgate-r1-r11-risk-auditor
description: Deterministic R1-R11 Pre-Trade Risk Gate, Wilder-Smoothed Technical Validator, 3-Rung Limit Ladder Sizer, and Counterfactual Rejection Logger for the Moomoo x Qoder AI Trading Agent Challenge.
metadata:
  version: "1.0.0"
  author: "AegisGate Trading Desk"
  competition: "2026 Moomoo x Qoder AI Trading Agent Challenge"
---

# AegisGate R1–R11 Deterministic Risk Auditor & Execution Skill

Use this skill inside your **Risk Auditor (`aegis-risk-auditor`)** and **Coordinator (`aegis-coordinator`)** agents on Qoder Cloud Agents (`qca`) or Qoder Desktop before permitting any `moomoo-sim-trading` order execution.

## Golden Invariant

> **Never let the Executor act on the Scout Researcher's output without `GATE_VERDICT: PASS (11/11)` from this skill.** Every evaluated proposal — whether `APPROVED` or `REJECTED` — must be appended as a structured JSONL line to `logs/decisions.jsonl` (and synced to the AegisGate Momen Audit Ledger) so counterfactual saved drawdown can be measured.

## The 11 Deterministic Competition Guardrails (`R01–R11`)

| Rule ID | Rule Name | Hard Competition Limit | AegisGate Deterministic Threshold |
|---|---|---|---|
| `R01` | **Minimum Share Price** | Stock/ETF price $\ge \text{USD } \$1.00$ | Reject if `entryPrice < 1.00` |
| `R02` | **Minimum Market Cap** | Company/Underlying mcap $\ge \text{USD } \$500\text{M}$ | Reject if `marketCapUsdM < 500` |
| `R03` | **Single-Ticker Concentration Cap** | Stock/ETF exposure $\le 40.0\%$ of account assets | Cap active buying at **$\le 36.0\%$** (leaves a 4.0% safety buffer per Briefing Slide 19) |
| `R04` | **Multi-Ticker Diversification** | Full capital deployment requires $\ge 3$ distinct tickers | Reject if post-trade invested $> 72\%$ across $< 3$ distinct tickers |
| `R05` | **Portfolio Open Heat Cap** | Total equity at risk across open stops $\le 6.0\%$ | Reject if `currentOpenHeatPct + newTradeRiskPct > 6.0%` |
| `R06` | **Per-Trade Risk Budget** | Reconciled Cloud (0.5–1.0%) vs Local Desk ($\le 0.75\%$) | Enforce `newTradeRiskPct <= 0.75%` in `FULL` regime (`<= 0.375%` in `CAUTIOUS`/`DEFENSE`) |
| `R07` | **Daily Drawdown Kill-Switch** | No Reset Card allowed; protect capital | Halt all new entries if `dailyPnlPct <= -2.0%` (`DEFENSE` lock at `peakDrawdownPct <= -10.0%`) |
| `R08` | **Daily Executed Order Ceiling** | Max 200 executed orders/day | Reject new entries if `ordersExecutedToday >= 190` (reserves 10 orders for emergency exits) |
| `R09` | **Options Expiry & Auto-Exercise Guard** | ITM options auto-exercise at close; can trigger forced liquidation | Reject new options with `DTE < 2`; trigger mandatory close on open options with `DTE <= 1` before 15:30 ET |
| `R10` | **Binary Earnings Buffer** | Avoid unhedged binary gap risk | Reject standard trend entries if `daysToEarnings <= 2` (unless explicitly tagged post-earnings `Buyable Gap-Up`) |
| `R11` | **SGT 3-Session & Holiday Flatten Guard** | Pre-Market (17:00 SGT), RTH (22:30 SGT), After-Hours (05:00 SGT); Nov 26 Closed; Nov 27 13:00 ET Early Close | Block Market orders in Pre/Post-Market (Limit-only); block all trades on Thu Nov 26 (Thanksgiving); force flatten/hedge check before `01:45 SGT Sat Nov 28` (Black Friday 12:45 ET) |

## Position Sizing & 3-Rung Limit Ladder Formula

1. **Deterministic Share Sizing (Stocks/ETFs):**
   ```text
   riskBudgetUsd = netAssetsUsd * maxRiskPctPerTrade  (e.g., $100,000 * 0.0075 = $750)
   perShareRisk  = abs(entryPrice - stopPrice)
   rawShares     = floor(riskBudgetUsd / perShareRisk)
   maxCapShares  = floor((netAssetsUsd * 0.36 - existingTickerNotionalUsd) / entryPrice)
   volCapShares  = floor(barVolume5m * 20 * 0.25)     (Moomoo 20x volume matching rule)
   finalShares   = max(0, min(rawShares, maxCapShares, volCapShares))
   ```
2. **3-Rung Limit-Order Ladder (Briefing Slide 32):**
   - **Rung 1 (T+0m):** Limit price at `midPrice` (`(bid + ask) / 2`), valid for 5 minutes.
   - **Rung 2 (T+5m):** Modify price via `moomoo sim order modify` to `min(askPrice, midPrice + 0.5 * spread)`.
   - **Rung 3 (T+10m):** Modify price to `askPrice` (hard ceiling — never chase above ask + 0.15% no-chase band). Cancel if unfilled at T+15m.

## Structured JSONL Decision Output Schema

Append one JSON line per evaluated proposal to `logs/decisions.jsonl`:

```json
{
  "id": "DEC-20261123-001",
  "timestampUtc": "2026-11-23T14:35:00Z",
  "sgtWindow": "REGULAR_HOURS_2230_0500_SGT",
  "symbol": "US.NVDA",
  "side": "BUY",
  "setup": "Ignite Bar + 3-Signal Anomaly Convergence",
  "regime": "FULL",
  "entryPrice": 142.50,
  "stopPrice": 138.80,
  "targetPrice": 151.80,
  "shares": 202,
  "notionalUsd": 28785.00,
  "positionWeightPct": 28.79,
  "riskPctEquity": 0.747,
  "gateVerdict": "APPROVED",
  "passedRulesCount": 11,
  "failedRules": [],
  "moomooCliCommand": "moomoo sim order buy US.NVDA 202 --account SIM-COMP-8801 --market US --type limit --price 142.50 --format json"
}
```
