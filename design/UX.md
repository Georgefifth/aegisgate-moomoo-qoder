# UX Contract — AegisGate (Moomoo × Qoder AI Trading Agent Control Plane)

> Fill this before writing UI code. It is the acceptance contract for the
> frontend: if the implementation does not match this file, the implementation
> is wrong. Keep it short and specific.

## 1. Product

- **One-liner:** Deterministic `R1–R11` multi-agent trading, risk auditing, and counterfactual rejection control plane for the Moomoo × Qoder AI Trading Agent Challenge.
- **Primary user:** Algorithmic traders, AI agent builders, and competition judges evaluating multi-agent Qoder Cloud Agents (`qca`) + Moomoo Paper Trading (`$100,000 USD` US stocks/ETFs/options) execution discipline.
- **Job to be done:** Audit multi-agent trade proposals against Moomoo's 11 hard competition guardrails (`R1–R11`), execute 3-rung limit-order ladders without unprotected stop gaps, quantify counterfactual drawdown saved by rejected trades, and export ready-to-run QCA Skill `.zip` packages and Forward Mode schedules.
- **Core success action:** Run a live or replay trade proposal through the **Scout → Red-Team Advisor → Deterministic `R1–R11` Risk Gate → 3-Rung Limit Ladder Executor** pipeline, inspect the exact gate pass/fail telemetry and counterfactual P&L impact, and export the verified QCA/Moomoo runnable bundle.
- **What the user should never have to guess:**
  1. Whether a proposal passed or failed each of the 11 competition risk rules (`R1` Price $\ge\$1$, `R2` Mcap $\ge\$500\text{M}$, `R3` Single-Stock Cap $\le 36\%$ [under 40% ceiling], `R4` $\ge 3$ Ticker Diversification, `R5` Portfolio Heat $\le 6.0\%$, `R6` Per-Trade Risk $\le 0.75\%$, `R7` Daily Drawdown $< 2.0\%$, `R8` Daily Orders $< 200$, `R9` Option Expiry $\text{DTE} > 1$, `R10` Earnings Buffer $> 2\text{d}$, `R11` SGT 3-Session & Thanksgiving/Black Friday Flatten Window).
  2. Current Market Regime (`FULL` / `CAUTIOUS` / `DEFENSE` / `CASH`) based on `QQQ` vs. 20-EMA and 11-Sector Relative Strength.
  3. Why the `AA Trading Desk Playbook` §08 cloud-vs-local conflicts occurred and how AegisGate reconciles them deterministically.
  4. Whether a rejected trade actually saved the portfolio from a loss (**Counterfactual Saved Drawdown** in USD and bps).

## 2. Core flow

| # | Step | User action | System feedback | Next step is obvious? |
|---|---|---|---|---|
| 1 | **Inspect Desk Posture & Candidate** | Land on the **01 // Gate & Execution Terminal** view; select a live/replay Moomoo anomaly candidate (or enter a custom ticker, side, entry, stop, and DTE) or click **"RUN FULL CYCLE AUDIT"**. | Instant (<50ms) deterministic computation of Wilder RSI, 10/20 EMA, ATR sizing, 3-Signal Moomoo Anomaly Convergence (`Technical`, `Capital Flow`, `Derivatives`), Red-Team Advisor critique, and live `R1–R11` Gate Matrix with exact numeric margins. | Yes — prominent primary CTA **"SUBMIT TO R1–R11 GATE & EXECUTE"** (or **"LOG REJECTION TO AUDIT LEDGER"** if any rule fails). |
| 2 | **Commit Decision / Stress-Test Override** | Click the primary action to commit the proposal to the Momen + Local Decision Ledger (or toggle the **"WHAT-IF STRESS SIMULATOR"** to test a rule violation such as >40% concentration, penny stock <$1, or Black Friday cutoff). | Visual stamp (`APPROVED -> 3-RUNG LIMIT LADDER QUEUED` in emerald or `BLOCKED BY R3/R11 -> SAVED DRAWDOWN LOGGED` in signal orange `#FF3300`), live update to the Equity & Counterfactual Curve Canvas, and WebSocket/Momen sync confirmation badge. | Yes — direct deep-link banner to **"VIEW IN COUNTERFACTUAL LEDGER (02)"** or **"EXPORT QCA SKILL & SCHEDULE BUNDLE (04)"**. |
| 3 | **Verify Counterfactual Proof & Export QCA Package** | Switch to **02 // Counterfactual & Rejection Ledger** or **04 // QCA Fleet & Skill Packager** and click **"EXPORT RUNNABLE QCA BUNDLE (.JSON + CLI)"**. | Downloads the complete QCA multi-agent configuration, verified Moomoo skill manifest, and JSONL decision audit log with a toast confirmation. | Yes — complete end-to-end judge and operator loop in $\le 3$ steps. |

Target: **$\le 3$ steps** and **$\le 90$ seconds** from landing to executing/auditing a full multi-agent trade cycle and exporting the runnable QCA configuration.

## 3. Pages (View Modes in Top Industrial Command Bar)

| Page / Mode | Purpose | Primary action | Secondary actions |
|---|---|---|---|
| **01 // GATE & EXECUTION TERMINAL** *(Default Landing)* | Live multi-agent proposal evaluation (`Scout` + `Advisor` + deterministic `R1–R11` Risk Gate + 3-Rung Limit Ladder generator) & Equity/Counterfactual Canvas. | **Evaluate & Commit Proposal through `R1–R11` Gate** (`#btn-commit-proposal`) | Pick preset Moomoo anomaly candidate (`NVDA`, `TSLA`, `PLTR`, `AMD`, `SMCI`, `GME` violation test, `SPY 0DTE` expiry test); run What-If Stress Simulator; invoke Momen ZAI Red-Team Advisor. |
| **02 // COUNTERFACTUAL REJECTION LEDGER** | Auditable log of every `APPROVED` fill and `REJECTED` proposal, proving what failed, which `R1–R11` gate blocked it, and how much drawdown was saved. | **Run Counterfactual Attribution & Export Audit CSV/JSONL** (`#btn-export-ledger`) | Filter by `ALL` / `APPROVED` / `REJECTED (SAVED LOSS)` / `RULE R1–R11`; inspect full JSON payload & Moomoo CLI command receipt. |
| **03 // REGIME & 11-SECTOR RS MATRIX** | Solves `AA Playbook` §04 & §08: live `QQQ` 20-EMA regime posture (`FULL`/`CAUTIOUS`/`DEFENSE`/`CASH`), 11 US SPDR Sector Relative Strength rankings, and Cloud-vs-Local Policy Reconciler. | **Apply Regime Allocation & Reconcile Policy** (`#btn-apply-regime`) | Toggle SGT trading session window (`PRE-MARKET 17:00 SGT`, `REGULAR 22:30 SGT`, `AFTER-HOURS 05:00 SGT`, `BLACK FRIDAY FLATTEN`); inspect 8 resolved AA Playbook conflicts. |
| **04 // QCA FLEET & SKILL PACKAGER** | Inspect the 4-thread QCA Forward Mode architecture (`Coordinator`, `Scout`, `Risk Auditor`, `Executor`, `Advisor`), verify the 11 packaged Moomoo Skill `.zip` specs, and generate copy-paste QCA Schedules & Moomoo CLI scripts. | **Generate & Download QCA Multi-Agent Bundle** (`#btn-download-qca-bundle`) | Copy natural-language QCA Forward Mode schedule prompt; copy `curl` API payload; inspect version-pinned `AGENTS.md` manifest. |

One primary action per view. Secondary actions are visually subordinate (`border: 1px solid #0C0C0C`, transparent background).

## 4. Required states

For every view and interactive component:

- [x] **Empty / first visit:** Actionable onboarding strip at top of terminal explaining the `$100,000 USD` Moomoo competition rules and a 1-click **"Load Preset Anomaly Scenario"** trigger if a filter returns zero rows.
- [x] **Loading:** Deterministic millisecond timer readout + visible `SCANNING MOOMOO ANOMALIES / RUNNING ZAI ADVISOR...` progress bar with live WebSocket frame counter (no dead UI).
- [x] **Success:** Stark industrial stamp (`GATE PASS 11/11 — 3-RUNG LIMIT ORDER TICKET GENERATED` or `REJECTED BY GATE — COUNTERFACTUAL TRACKING ACTIVE`) with timestamp and Momen/Local persistence confirmation.
- [x] **Error:** Explicit error banner naming the exact failure (e.g., Momen GraphQL unreachable or invalid order parameter) and immediate recovery action (**"Retry Momen Sync"** or **"Continue in Deterministic Local Engine"**).
- [x] **Invalid input:** Field-level highlight in signal orange (`#FF3300`) with exact mathematical reason (e.g., `"Stop price ($192.00) must be below Entry price ($185.00) for a LONG position"` or `"Price must be > $0"`).
- [x] **No permission / Cloud Vault status:** Explicit Momen BaaS & QCA Vault status indicator in header (`LIVE MOMEN BaaS + DETERMINISTIC ENGINE` / `READ-ONLY SIMULATOR GUARD`), showing which agent threads hold Moomoo OAuth vault permissions.
- [x] **Mobile 390px layout:** Single-column stacked Swiss brutalist grid at `390px` width; horizontal tab bar wraps cleanly with $\ge 44\text{px}$ touch targets and zero horizontal overflow (`overflow-x: hidden`).

## 5. Design tokens

- **Font family and scale:**
  - Display / Headers: `'Space Grotesk', sans-serif` (700 bold uppercase, tracking `-0.03em`, line-height `0.96`). Scale: Hero Masthead `clamp(28px, 3.4vw, 46px)`, Section Header `20px`, Subhead `15px`.
  - Editorial Callouts / Index Numerals: `'Instrument Serif', serif` (italic `28px–42px` for rule numbers `R01–R11` and posture callouts).
  - Telemetry / Code / Prices / Tables: `'IBM Plex Mono', monospace` (`12px` body, `11px` uppercase tags, `tabular-nums` everywhere so prices, P&L, and percentages align to the pixel).
- **Spacing scale:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Colors (`01 // Swiss Brutalism` adapted for Quantitative Risk Precision):**
  - Background Primary (Warm Archival Newsprint): `#F2EFE9`
  - Background Secondary / Elevated Cell: `#EAE5DC`
  - Background Terminal Contrast (Canvas & Code Blocks): `#0C0C0C`
  - Text Primary (Stark Carbon Ink): `#0C0C0C`
  - Text Muted (Industrial Graphite): `#4A4742`
  - Accent Primary / Risk Block / Kill-Switch (International Signal Orange): `#FF3300`
  - Accent Pass / Positive Expectancy (Deep Swiss Emerald): `#006B3F` (and `#00E676` on dark `#0C0C0C` canvas)
  - Accent Warning / Cautious Regime (Industrial Amber): `#C87A00`
- **Radius and borders:**
  - `border-radius: 0px` globally (strictly zero rounded corners).
  - Structural grid hairlines: `2px solid #0C0C0C` for outer frames and primary splits; `1px solid #0C0C0C` for internal matrix cells.
  - Interactive elevation: `box-shadow: 4px 4px 0px #0C0C0C` on primary buttons; hover shifts `transform: translate(-2px, -2px)` with `6px 6px 0px #0C0C0C`.
- **Button and input height:** Minimum `44px` height on all buttons, inputs, select dropdowns, and tab triggers (WCAG / mobile touch target compliant).
- **Icon style and stroke:** Custom crisp `1.75px` stroke inline SVG technical symbols (crosshairs, gate locks, ladder rungs, circuit switches) — **zero emojis anywhere in the UI**.

## 6. References

| Reference (URL or screenshot) | What to borrow | What not to copy |
|---|---|---|
| **AA Trading Desk — The Playbook** (`https://trading-playbook-j692pppjg7l.qoder.website/`) | Clearnumbered section hierarchy (`01`–`09`), explicit rule gates before conviction, regime posture table (`FULL`/`CAUTIOUS`/`DEFENSE`/`CASH`), and transparent rule reconciliation table. | Do not copy its read-only static nature (our terminal executes live `R1–R11` math, sizing, and counterfactual tracking) or its dark aurora background. |
| **Alwin's Challenge Dashboard** (`https://challenge-dashboard-j692pppjg7l.qoder.website/`) | Top-level competition KPI clarity (`$100,000` benchmark, Largest Position vs. 40% cap, QCA Agent Fleet status, Equity vs. Drawdown curve). | Do not copy its generic dark rounded cards or its dependency on `127.0.0.1:11111` local OpenD (which Moomoo Agent Hub deprecated in favor of `moomoo` CLI + MCP OAuth). |
| **Moomoo Strategy Briefing Deck — Slides 8, 19, 32, 34** (`https://moomoo-strategy-briefing-j692pppjg7l.qoder.website/`) | 3-Session SGT isolation (`17:00`, `22:30`, `05:00` SGT), Thanksgiving/Black Friday flatten timers, 3-rung Limit-Order Ladder table (`+$0.10` steps capped at ask), and Positive Expectancy formula `(Win% * AvgWin) - (Loss% * AvgLoss)`. | Slide deck chrome or presentation watermarks. |

## 7. Mobile

- **390px layout:** CSS Grid collapses from 12-column desktop brutalist matrix into a single-column vertical stack (`grid-template-columns: 1fr`) at `max-width: 900px`.
- **Primary action reachable without horizontal scroll:** Primary CTA button (`#btn-commit-proposal`) is full-width (`width: 100%`, `min-height: 48px`) directly below the proposal inputs, with `overflow-x: hidden` on `html, body`.
- **What is collapsed or hidden:** Wide data tables (Counterfactual Ledger & 11-Sector Matrix) use responsive card-row stacking or clean internal horizontal scroll containers so the page viewport never overflows `390px`.
- **Keyboard behavior:** All form inputs use semantic `<label for="...">`, numeric inputs use `inputmode="decimal"`, and `Enter` submits the active proposal evaluation.

## 8. Visual direction

- **Aesthetic Cartridge:** `01 // Swiss Brutalism (BRUTALIST_GRID)` fused with high-contrast `#0C0C0C` quantitative telemetry scopes.
- **Three adjectives:** **Deterministic, Industrial, Auditable.**
- **Product archetype:** **Quantitative Risk & Execution Terminal + Editorial Audit Broadsheet.**
- **Palette and why it fits the domain:** Warm archival newsprint (`#F2EFE9`) + stark carbon ink (`#0C0C0C`) + international signal orange (`#FF3300`) + Swiss emerald (`#006B3F`). Unlike every other crypto/AI trading bot that uses a cliché dark-purple/neon-blue glassmorphism dashboard, AegisGate looks like an institutional Swiss risk-control schematic and financial broadsheet where **every basis point, rule gate (`R01–R11`), and counterfactual rejection stands out with razor-sharp legibility**.
- **Type pairing (3 families):** `Space Grotesk` (structural headers) + `Instrument Serif Italic` (rule indices & regime callouts) + `IBM Plex Mono` (all numeric telemetry, prices, order tickets, and JSON logs).
- **Density:** **High-density tool layout** — exposed `2px solid #0C0C0C` hairlines divide the screen into zero-waste functional bays (Top Regime & Session Ticker → Left Proposal & Anomaly Input Bay → Center `R1–R11` Deterministic Gate Matrix & 3-Rung Limit Ladder Ticket → Right Live Equity vs. Counterfactual Saved-Drawdown Canvas).
- **Signature element (one thing this product owns):** **The Interactive `R01–R11` Deterministic Gate Matrix & Counterfactual Saved-Drawdown Scope** — an 11-cell hardware-style annunciator panel paired with a dual-line HTML5 Canvas chart plotting **Actual Guarded Portfolio Equity (Emerald)** against **Ungated Counterfactual Equity (Signal Orange Dashed)**, visually proving in real time how much drawdown the Risk Auditor prevented by blocking rule-violating trades.
- **Motion rules:** Crisp `120ms` mechanical state transitions (`translate(-2px, -2px)` hard-shadow shifts on buttons, instant cell polarity flips on `R1–R11` gate checks, smooth 60fps cursor crosshair inspection on the HTML5 Canvas equity scope). Never animate layout shifts or decorative floating blobs.
- **Rejected clichés:** Purple gradient, glassmorphism, three-card hero, generic KPI dashboard, emoji icons, abstract blob art, rounded-2xl cards.

**Generic test:** Could this first screen be dropped into any other SaaS product without looking out of place? **No** — the top SGT/ET 3-session exchange clock, the `R01–R11` Moomoo competition guardrail annunciator matrix, the 3-rung limit-order ladder ticket, and the Actual-vs-Counterfactual Saved-Drawdown scope are 100% bespoke to the Moomoo × Qoder AI Trading Agent Challenge.

## 9. Momen Headless Backend Contract

- **Project ExId (`projectExId`):** Configurable via `VITE_MOMEN_PROJECT_EX_ID` / `src/momenClient.ts` (with automatic live-probe and deterministic local persistence fallback so zero features break if Momen auth is pending).
- **Runtime HTTP Endpoint:** `https://villa.momen.app/zero/<projectExId>/api/graphql-v2`
- **Runtime WS Endpoint:** `wss://villa.momen.app/zero/<projectExId>/api/graphql-subscription`
- **PostgreSQL Tables (singular `snake_case`) & Relations:**
  - `trade_decision`: `id`, `symbol`, `side`, `strategy_setup`, `entry_price`, `stop_price`, `target_price`, `shares`, `notional_usd`, `position_weight_pct`, `risk_pct_equity`, `anomaly_score`, `regime_posture`, `gate_verdict` (`APPROVED` | `REJECTED`), `failed_rules_csv`, `advisor_summary`, `counterfactual_pnl_usd`, `session_window`, `created_at`
  - `portfolio_state`: `id`, `account_label`, `net_assets_usd`, `cash_usd`, `buying_power_usd`, `open_heat_pct`, `daily_pnl_usd`, `max_drawdown_pct`, `saved_drawdown_usd`, `orders_today_count`, `updated_at`
- **Direct GraphQL Queries & Mutations:**
  - `query FetchDecisions`: reads latest `trade_decision` rows ordered by `id desc`
  - `mutation InsertDecision`: `insert_trade_decision_one(object: ...)`
  - `mutation UpdatePortfolioState`: `update_portfolio_state_by_pk(pk_columns: {id: ...}, _set: ...)`
- **Live WebSocket Subscriptions (`subscriptions-transport-ws`):**
  - `subscription OnTradeDecisionStream`: streams live `trade_decision` updates across connected judge/operator browsers.
- **ZAI Agents (`configId`, model `gemini-3.8-flash`, input `argKey`s):**
  - Red-Team Advisor Agent: evaluates candidate symbol, catalyst headline, anomaly convergence, and `R1–R11` gate telemetry to produce a concise institutional counter-thesis before execution.
- **Async Actionflow (`flowId`, max 1 flow on free plan):**
  - `AuditAndLogProposalFlow`: runs ZAI Red-Team Advisor $\rightarrow$ persists audit record into `trade_decision`.

## 10. UX acceptance

- [x] A first-time user can explain the product's purpose within 5 seconds
- [x] The core task is reachable from the landing page without reading docs
- [x] Every action produces visible feedback within 100ms, or a loading state
- [x] Every error says what happened and what to do next
- [x] Empty states are actionable, not blank
- [x] No dead ends; no unlabeled icon-only buttons
- [x] Desktop (1440px) and mobile (390px) screenshots reviewed side by side
- [x] The flow works seamlessly both with deterministic local state and when connected to the Momen backend / QCA export pipeline
