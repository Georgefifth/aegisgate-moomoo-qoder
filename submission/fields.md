# Submission Fields — AegisGate (2026 Moomoo × Qoder AI Trading Agent Challenge)

## 1. Project Name

```text
AegisGate — Deterministic R01–R11 Multi-Agent Trading & Risk Control Plane
```

## 2. Elevator Pitch (186 characters — max 200)

```text
Multi-agent Qoder Cloud Agents + Moomoo Unusual Skills gated by a 0.0066ms deterministic R01–R11 risk engine, 3-rung limit ladders, and a first-class Counterfactual Rejection Ledger.
```

## 3. Official Moomoo × Qoder Challenge Links ("Try it out" / Survey Links)

- **Live Control Plane Dashboard URL:** `https://moomoo-x-qoder.vercel.app/`
- **Live 10-Slide Qoder Presentation Deck URL:** `https://moomoo-x-qoder.vercel.app/deck.html`
- **Backup Public Mirror (GitHub Pages):** `https://georgefifth.github.io/aegisgate-moomoo-qoder/`
- **Backup Presentation Deck (GitHub Pages):** `https://georgefifth.github.io/aegisgate-moomoo-qoder/deck.html`
- **Public GitHub Repository (Runnable Trading-Agent Package):** `https://github.com/Georgefifth/aegisgate-moomoo-qoder`
- **Competition Paper Account Name (`TODO(human)`):** `Moomoo x Qoder AI Paper Trading Agent Challenge` (Verify your personal Moomoo SG ID / Competition Account ID in Moomoo App → Discover → Paper Trade → Competition)

## 4. About the Project (Copy-Paste Markdown)

```md
## Inspiration

While analyzing open-source AI trading frameworks (`TauricResearch/TradingAgents`, `virattt/ai-hedge-fund`) and the official **2026 Moomoo × Qoder AI Trading Agent Challenge** reference baseline (`AA Trading Desk Playbook`), we uncovered four critical failure modes that cause LLM trading agents to blow up accounts:

1. **LLM & Helper Indicator Math Bugs:** In `virattt/ai-hedge-fund` (PR #759), the shared RSI helper used Cutler's simple rolling mean instead of Wilder's exponential smoothing. Across 1,386 real Yahoo Finance daily bars (`NVDA`, `PLTR`, `SMCI`, `TSLA`, `META`, `AVGO`), we measured up to **29.22 RSI points of divergence** and **235 false 30/70 overbought/oversold signal flips**.
2. **Unsettled Market Feed Glitches:** As documented in `TradingAgents` (PR #1707), market feeds can return unsettled trailing bars with blank `NaN` close prices alongside non-zero volume (`2026-11-18,,,,,18935325`), causing LLM agents to hallucinate on empty bars.
3. **Cloud-vs-Local Policy Drift:** Section 08 ("Rules to Reconcile") of the official `AA Trading Desk Playbook` lists **8 unresolved policy conflicts** between cloud prompts and local desk rules (such as `0.5-1.0%` vs `<= 0.75%` per-trade risk, `100%` vs `85%` max exposure, and conflicting weak-sector short rules), warning that *"a visual label is not yet a deterministic execution rule."*
4. **Unprotected Paper Stops & 0DTE Auto-Exercise Liquidation:** Moomoo's paper trading API supports `Limit` and `Market` orders rather than resting broker stop orders (*"A stop level is not a stop order"*), and automatically exercises all ITM options at expiry market close (Moomoo Paper T&C §5). In a competition where **Reset Cards are strictly prohibited**, a single ungated `>40%` concentration order or 0DTE option expiry can trigger forced liquidation.

We built **AegisGate** to separate **qualitative multi-agent LLM discovery** (via Qoder Cloud Agents + Moomoo Unusual & Content Skills) from **zero-hallucination quantitative risk and execution governance**.

## What it does

**AegisGate** is a deterministic `R01-R11` multi-agent trading, risk auditing, and counterfactual execution control plane for the Moomoo × Qoder Challenge:

- **4-Thread Qoder Cloud Agents (`qca`) Forward Mode Fleet + Independent Advisor:**
  - `aegis-coordinator` (v4, Main Thread): Routes Singapore/ET 3-session trading windows (`17:00 SGT` Pre-Market, `22:30 SGT` Regular Open, `05:00 SGT` After-Hours, Thanksgiving Nov 26 skip, and Black Friday Nov 27 `12:40 ET` / Nov 28 `01:40 SGT` early-close flatten) and enforces the golden rule: *never call the Executor unless the Risk Auditor returns `GATE_VERDICT: PASS (11/11)`*.
  - `aegis-scout` (v2, Read-Only Child Thread): Synthesizes 7 Moomoo skills (`moomoo-quote`, `moomoo-news-search`, `moomoo-stock-digest`, `moomoo-comment-sentiment`, `moomoo-unusual-technical-signal-alerts`, `moomoo-unusual-capital-flows`, `moomoo-unusual-derivatives-activity`) with Wilder-smoothed technicals and 11-Sector SPDR Relative Strength. Zero order permissions.
  - `aegis-risk-auditor` (v3, Isolated Child Thread): Executes the **11 deterministic competition guardrails (`R01-R11`)** in `0.0066 ms` and logs both approved and rejected proposals to `logs/decisions.jsonl`.
  - `aegis-executor` (v2, Vault-Authorized Child Thread): Talks exclusively to the competition paper account (`moomoo sim`) using a **3-Rung Limit-Order Ladder** (`T+0m` Midpoint -> `T+5m` +50% spread -> `T+10m` Ask Ceiling) and a **5-Minute Stop Escalation Watchdog**.
  - `aegis-red-team-advisor` (`{"type":"advisor","model":"ultimate"}`): Provides an independent, tool-free adversarial critique before any position `>20%` NAV or regime shift.
- **First-Class Counterfactual Rejection Ledger:** Tracks rejected proposals against subsequent market moves to quantify **Counterfactual Drawdown Saved** (`+$12,270.90` saved across 4 blocked traps: `US.TSLA` pre-market spike, `US.SMCI` 1-day pre-earnings `40.15%` breach, `US.SPY` 0DTE option expiry trap, and `US.FFIE` `$0.68` penny stock pump).
- **12 Pre-Packaged & Validated QCA Skill `.zip` Archives:** Includes all 11 official `MoomooOpen/moomoo-agent-hub` skills plus our custom `aegisgate-r1-r11-risk-auditor.zip`, validated against QCA's skill schema (single top-level folder matching `SKILL.md` YAML `name` and repaired relative links).

## How we built it

- **Deterministic Quantitative & Risk Gate Engine (`src/engine/`):** Written in strict TypeScript (`quantIndicators.ts`, `riskGate.ts`, `marketDataset.ts`, `qcaPackager.ts`). Implements Wilder's exponential RSI/ATR smoothing, `sanitizeBars()` to drop unsettled `NaN` rows, the 11-Sector SPDR composite (`0.30*R12 + 0.30*R6 + 0.20*R3 + 0.20*R1`) with Weinstein 50/200 SMA stage caps, and `R01-R11` boundary checks (`Price >= $1.00`, `Mcap >= $500M`, `Single-Ticker <= 36.0%` [4% buffer under 40% ceiling], `>= 3 Tickers` if `>72%` deployed, `Portfolio Heat <= 6.0%`, `Trade Risk <= 0.75% & >= 1.5R`, `Daily DD > -2.0%`, `Orders < 190/200 & 5mVol > 0`, `Option DTE >= 2 & Delta >= 0.60`, `Earnings > 2d`, and `SGT 3-Session / Holiday Guard`).
- **Swiss Brutalist Control Plane (`src/App.tsx`, `src/components/EquityCounterfactualCanvas.tsx`):** Built with React 19, TypeScript, Vite, and an interactive HTML5 Canvas oscilloscope plotting Guarded Portfolio Equity (`#00E676`) against Ungated Counterfactual Equity (`#FF3300` dashed), backed by dual-channel Momen GraphQL/WebSocket + local persistence (`src/momenClient.ts`).
- **Automated QCA Skill Packager (`scripts/package-qca-skills.mjs`) & Real-World Validation Suite (`scripts/run-aegis-validation.ts`):** Automated CLI scripts that package and validate all 12 `.zip` skills and benchmark the strategy across 19 real 1-year Yahoo Finance datasets (`4,769` daily bars).

## Challenges we ran into

1. **Zero-Volume Liquidity & `NaN` Edge Cases in Stage 3.5 Validation:** When we stress-tested `evaluateProposalThroughGate` against 25 multi-difficulty cases (`evidence/stage-3.5-validation/initial-results.json`), we discovered that `Math.max(1, Math.floor(0 * 20 * 0.25))` defaulted to 1 share when 5-minute bar volume was `0` (violating Moomoo Paper T&C §7), and passing `entryPrice = NaN` caused JavaScript's `Math.max(0.01, NaN)` to return `NaN`. We fixed both in `src/engine/riskGate.ts` and verified `25/25 (100%)` pass in `final-results.json`.
2. **Mobile `390px` Grid & `<select>` Intrinsic Width in Headless Firefox (Stage 3 QA):** During real-browser Playwright Firefox QA at `390x844`, long option strings inside `#select-sgt-session` expanded the CSS Grid column beyond `390px`. Adding `min-width: 0; max-width: 100%; width: 100%` across grid children and collapsing `.regime-simulator-grid` resolved the issue across all `36/36` desktop and mobile QA scenarios.
3. **Historical Options Data Scope:** Because the Moomoo MCP does not yet provide multi-year historical options chains for backtesting (confirmed in Official FAQ line 911), we explicitly scoped `R09` (`DTE >= 2`, `Delta >= 0.60`, full-premium risk sizing) to live option snapshots rather than fabricating historical options backtests.

## Accomplishments that we're proud of

- **Proven 3.4x Drawdown Reduction on 4,769 Real Yahoo Finance Bars:** Across a 190-day out-of-sample rolling test on 6 high-beta US stocks (`NVDA`, `PLTR`, `META`, `AVGO`, `SMCI`, `TSLA`), AegisGate blocked **275 high-risk/bear-regime entries**, cutting Maximum Drawdown from **`-27.22%`** (Ungated Cutler baseline) to **`-7.97%`** and outperforming by **`+9.17%`** (`+0.32%` vs `-8.85%`).
- **Prevented 235 False RSI Threshold Flips:** Demonstrated and eliminated up to `29.22` RSI points of Cutler vs. Wilder divergence across `1,386` real equity bars.
- **0.0066 ms Deterministic Gate Latency:** Evaluates all 11 rules + 3-rung limit ladders `1,000` times in `6.58 ms` with zero LLM token burn.
- **Complete, Turnkey QCA & Moomoo Package:** Ships a live control plane, a 10-slide interactive HTML deck, 12 validated `.zip` skill packages, 4 pinned agent templates, and `logs/decisions.jsonl`.

## What we learned

Treating an LLM as a qualitative analyst ("the eyes") while enforcing position sizing, indicator math, concentration limits, and session cutoffs in deterministic code ("the brakes") is the single highest-leverage architectural pattern for agentic finance. Furthermore, logging **rejected decisions** as a first-class artifact provides far stronger evidence of risk discipline than showing an equity curve alone.

## What's next for AegisGate

1. **Direct WebSocket Quote Push (`wss://webapi-quote.moomoo.com/ws`):** Connect Moomoo's Open API WebSocket quote push and `BROKER_QUEUE` stream directly into the 5-minute Stop Escalation Watchdog for sub-second structural stop monitoring.
2. **Multi-Leg Defined-Risk Options (`Vertical Spreads` & `Iron Condors`):** Add automated leg-by-leg reconciliation for vertical debit/credit spreads within Moomoo's 200-order daily allowance.
```

## 5. Built With (Tags)

```text
qoder, qoder-cloud-agents, moomoo, moomoo-openapi, mcp, react, typescript, vite, html5-canvas, playwright, algorithmic-trading, risk-management, multi-agent-systems
```

## 6. Image Gallery (`submission/assets/`) & Captions (Each <= 150 characters)

1. **`submission/assets/thumbnail.png`** (1200×800, 3:2, 132 KB)  
   *Caption:* `AegisGate: 4-Thread Qoder Cloud Agents + Deterministic R01–R11 Risk & Execution Control Plane for Moomoo Paper Trading.` (120 chars)
2. **`submission/assets/gallery-01-terminal-approved.png`** (1200×800, 3:2, 292 KB)  
   *Caption:* `01 // Gate & Execution Terminal: US.NVDA passes 11/11 rules with 3-rung limit-order ladder and counterfactual scope.` (116 chars)
3. **`submission/assets/gallery-02-terminal-veto.png`** (1200×800, 3:2, 289 KB)  
   *Caption:* `02 // Deterministic Gate Veto: US.SMCI pre-earnings and 41.5% concentration trap blocked by R03, R05, R06, R10 (+$6,348 saved).` (127 chars)
4. **`submission/assets/gallery-03-counterfactual-ledger.png`** (1200×800, 3:2, 178 KB)  
   *Caption:* `03 // First-Class Counterfactual Rejection Ledger: Auditable logs/decisions.jsonl tracking realized fills and saved losses.` (123 chars)
5. **`submission/assets/gallery-04-regime-11sectors.png`** (1200×800, 3:2, 177 KB)  
   *Caption:* `04 // Market Regime Simulator (QQQ 20-EMA), 11 US SPDR Sector Relative Strength & AA Playbook §08 Conflict Reconciler.` (118 chars)
6. **`submission/assets/gallery-05-qca-fleet-12zips.png`** (1200×800, 3:2, 102 KB)  
   *Caption:* `05 // QCA Multi-Agent Roster (Coordinator, Scout, Risk Auditor, Executor, Advisor), 3 Schedules & 12 Skill ZIP Packages.` (120 chars)
7. **`submission/assets/gallery-06-empirical-validation.png`** (1200×800, 3:2, 321 KB)  
   *Caption:* `06 // Stage 3.5 Empirical Benchmark: 4,769 real Yahoo Finance bars proving 7.97% vs 27.22% max drawdown and 235 prevented flips.` (128 chars)

## 7. Demo Video & Presentation Deck Files

- **Rendered 1080p30 MP4 Demo Video:** `submission/assets/demo.mp4` (and `evidence/stage-4-demo/demo.mp4`, `1920×1080`, `30 fps`, `73.3s`, `11.45 MB`)
- **Interactive 10-Slide Presentation Deck:** `submission/assets/deck.html` (Live at `https://moomoo-x-qoder.vercel.app/deck.html`)
- **Structured Decision & Rejection Log:** `submission/assets/decisions.jsonl` (and `logs/decisions.jsonl`)
- **12 Validated QCA Skill `.zip` Packages:** `submission/assets/qca-skills/*.zip`
