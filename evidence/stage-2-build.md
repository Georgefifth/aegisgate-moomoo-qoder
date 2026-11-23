# Stage 2 — Competitive Analysis, UX Contract, Implementation & Deployment Evidence

**Project:** AegisGate — Deterministic `R01–R11` Multi-Agent Trading, Risk Auditing & Counterfactual Control Plane (2026 Moomoo × Qoder AI Trading Agent Challenge)  
**GitHub Repository:** https://github.com/Georgefifth/aegisgate-moomoo-qoder  
**Live Production URL (Vercel):** https://moomoo-x-qoder.vercel.app/  
**Live Backup URL (GitHub Pages):** https://georgefifth.github.io/aegisgate-moomoo-qoder/  

---

## 1. Competitor Product Analysis (Verified Facts & Hands-On Inspection)

We inspected and tested 5 direct and indirect competing systems across official competition reference baselines, open-source multi-agent frameworks, and commercial AI trading tools:

| Competitor & Source Link | Category & Pricing | Steps to Core Result | Visual Design & UX | What They Do Well (Strengths) | Verified Limitations & Gaps We Address |
|---|---|---|---|---|---|
| **1. AA Trading Desk Playbook** ([Live Site](https://trading-playbook-j692pppjg7l.qoder.website/)) | Organizer Reference Baseline (Free) | Read-only reference (manual 7-checkbox checklist; 0 live calculations) | Clean dark-to-light editorial guide (`Space Grotesk` + `IBM Plex Mono`) | Clear explanation of Kell-style trend setups (`01`–`08`), QQQ 20-EMA regime table (`FULL`/`CAUTIOUS`/`DEFENSE`/`CASH`), and transparent documentation of 8 cloud-vs-local policy conflicts in §08. | **Read-only static HTML:** Cannot calculate share sizing, does not enforce `R01–R11` deterministically, leaves 8 policy conflicts unresolved (§08), and clears manual checkboxes on reload. |
| **2. Alwin's Challenge Dashboard** ([Live Site](https://challenge-dashboard-j692pppjg7l.qoder.website/)) | Organizer Reference Dashboard (Free) | 1-screen passive monitor (requires local OpenD `127.0.0.1:11111` running) | Standard dark cards (`#05070d`) with green equity sparkline | Clear top-level KPI layout (`$100,641` Paper Portfolio Value, `35.5%` Largest Position vs. 40% cap, `2/2` Agent Fleet status). | **Shows `Connecting / —` when OpenD is absent** (note: `MoomooOpen/moomoo-agent-hub` deprecated OpenD in favor of `moomoo` CLI + MCP OAuth); does not surface rejected trades or counterfactual saved drawdown. |
| **3. TauricResearch / TradingAgents** ([GitHub](https://github.com/TauricResearch/TradingAgents)) | Open-Source Python CLI / LangGraph (Apache-2.0) | 5–7 CLI prompts (`tradingagents` ticker/date/model selection + multi-minute debate wait) | Terminal text / basic HTML report (PR #1717) | Rich multi-persona analyst debate (fundamental, sentiment, technical, bull/bear, risk team). | **1. High debate latency kills candle-close execution** ([Issue #1704](https://github.com/TauricResearch/TradingAgents/issues/1704)).<br>**2. Unsettled Yahoo Finance bars with blank close prices handed to LLMs** ([PR #1707](https://github.com/TauricResearch/TradingAgents/pull/1707)).<br>**3. No Moomoo competition rules (`40%` cap, `200` orders/day, 3-session SGT isolation).** |
| **4. virattt / ai-hedge-fund** ([GitHub](https://github.com/virattt/ai-hedge-fund)) | Open-Source Python CLI/TUI (MIT) | 4 CLI steps (`poetry run aihf`, pick analysts, ticker, date range) | Textual TUI / CLI tables | Famous investor personas and modular signal registry. | **1. Indicator math bug:** Shared `_compute_rsi` used Cutler's simple rolling mean instead of Wilder's smoothing, diverging by **10.2 RSI points** from TA-Lib/TradingView ([PR #759](https://github.com/virattt/ai-hedge-fund/pull/759)).<br>**2. Short financing & fee reconciliation errors** ([PR #754](https://github.com/virattt/ai-hedge-fund/pull/754)). |
| **5. Composer.trade** ([Website](https://www.composer.trade/)) | Commercial No-Code Quant SaaS ($0 Starter / Paid Pro) | 4 steps (Prompt AI -> Edit Symphony -> Backtest -> Activate) | Modern SaaS flowchart editor | Intuitive visual `IF/THEN` block editor and automatic fee/slippage modeling. | **Executes only once daily near market close**—cannot manage Moomoo's 3 daily SGT sessions (Pre-Market 17:00, RTH 22:30, After-Hours 05:00), 3-rung limit-order laddering, or Moomoo `unusual` anomaly APIs. |

---

## 2. Product Audit & Prioritized Optimization Plan

### 2.1 Core Workflow Bottlenecks Identified & Solved

| Priority | Problem Identified in Existing Workflows | Concrete Improvement in AegisGate | Why It Matters | Verification Method |
|---|---|---|---|---|
| **P0** | **LLM Indicator & Sizing Math Hallucinations** (`ai-hedge-fund` PR #759 10.2-pt RSI bug; `TradingAgents` PR #1707 blank-bar bug) | Built `src/engine/quantIndicators.ts` & `src/engine/riskGate.ts` in pure deterministic TypeScript with Wilder-smoothed RSI/ATR, blank-bar sanitization, and exact risk-parity share sizing (`floor(riskBudget / abs(entry - stop))`). | Eliminates false overbought/oversold flips and prevents LLMs from breaching Moomoo's 40% concentration cap or $1/$500M eligibility floors. | Unit test suite (`tests/engine.test.ts` #1, #2, #5) + live `MATH // Wilder vs. Cutler RSI Proof` cell in UI. |
| **P0** | **8 Unresolved Cloud-vs-Local Policy Conflicts** (`AA Trading Desk Playbook` §08) | Unified all 11 competition & desk rules into the **Deterministic `R01–R11` Gate Annunciator** (`<=36%` single-ticker cap, `>=3` tickers if `>72%` deployed, `<=6%` portfolio heat, `<=0.75%` trade risk, `>-2%` daily DD kill-switch, `<190/200` orders, `DTE>=2` option expiry guard, `>2d` earnings buffer, SGT 3-session & holiday cutoff). | Directly solves the open design problems documented by the competition organizers themselves. | Interactive `R01–R11` matrix + Tab 03 `AA Playbook §08 Reconciler` table. |
| **P0** | **Opaque Rejections ("What Failed and Why?")** (Participant Handbook §8.2) | Built the **First-Class Counterfactual Rejection Ledger** (`Tab 02`) + **Dual-Line Guarded vs. Ungated Counterfactual Canvas Scope** (`Tab 01`). | Judges explicitly reward logs of *rejected* decisions and proof of how risk controls protected the $100k account where Reset Cards are banned. | Live interactive commit flow + downloadable `aegisgate-decisions-audit.jsonl` & `logs/decisions.jsonl`. |
| **P1** | **Unprotected Paper Stops & Extended-Hours Slippage** (Playbook §05 & Slide 32) | Implemented the **3-Rung Limit-Order Ladder** (`T+0m` Midpoint, `T+5m` +50% spread, `T+10m` Ask Ceiling) + **5-Min Stop Escalation Watchdog SOP** + copy-ready `moomoo sim order` CLI commands. | Prevents wide-spread slippage in Pre/Post-Market and bridges Moomoo Paper API's lack of resting stop orders. | Verified in `tests/engine.test.ts` #5 & #6 and Tab 01 Ladder Ticket. |
| **P1** | **QCA Skill Packaging & Multi-Agent Version Drift** (Handbook §4.2.1 & §8.1) | Built `scripts/package-qca-skills.mjs` to automatically package & validate all **11 official Moomoo skills + 1 custom `aegisgate-r1-r11-risk-auditor` skill** into QCA-compliant single-folder `.zip` archives with repaired relative links (`public/qca-skills/`). | Saves hours of manual packaging errors and provides judges with a 1-click runnable QCA multi-agent bundle (`Tab 04`). | Automated ZIP integrity & YAML frontmatter verification (`allValid: true`, 12/12 `.zip` files downloadable). |

---

## 3. Before / After Workflow Efficiency Comparison

| Metric | Baseline Workflow (Manual Qoder Prompt + Static AA Playbook) | AegisGate Control Plane Workflow | Measured Improvement |
|---|---|---|---|
| **Steps from Candidate to Full 11-Rule Risk Audit & Sizing** | 7 manual steps (query quote, check mcap, calculate shares by hand, check sector rank, check earnings date, check 40% cap, format CLI command) | **1 click** (Select candidate or enter parameters $\rightarrow$ instant `<10ms` deterministic `R01–R11` evaluation + 3-rung CLI ticket) | **85% fewer steps** (7 steps $\rightarrow$ 1 step; ~6 mins $\rightarrow$ <10 seconds) |
| **Steps to Package 12 QCA Skills & Schedules** | 12 manual folder zips + manual link repairs + manual cron timezone conversions | **1 click** in Tab 04 (`EXPORT RUNNABLE QCA BUNDLE` or individual `.zip` downloads) | **100% automated & validated** (`12/12 PASS`) |
| **Counterfactual Rejection Visibility** | 0% (rejected ideas disappear in chat history) | **100% persisted** (`logs/decisions.jsonl` + Canvas Saved-Drawdown curve quantifying `+$12,270.90` saved across 4 blocked traps) | Full auditability for competition judging |

---

## 4. Visual Direction & Frontend Verification (`design/UX.md`)

- **Aesthetic Cartridge:** `01 // Swiss Brutalism (BRUTALIST_GRID)` — Warm archival newsprint (`#F2EFE9`), stark carbon ink (`#0C0C0C`), international signal orange (`#FF3300`), deep Swiss emerald (`#006B3F`), `0px` border radius globally, exposed `2px solid #0C0C0C` structural hairlines, and an embedded `#0C0C0C` oscilloscope canvas.
- **Typography:** `Space Grotesk` (700 uppercase headers) + `Instrument Serif Italic` (`R01–R11` rule indices) + `IBM Plex Mono` (`tabular-nums` telemetry & CLI tickets).
- **Screenshots Captured & Verified (`evidence/stage-2-build/frontend/`):**
  1. `01-desktop-terminal-approved-1440px.png` — Desktop `1440x900` landing view (`US.NVDA` Ignite Bar passing 11/11 rules with 3-rung limit ladder & counterfactual scope).
  2. `02-desktop-terminal-rejected-veto-1440px.png` — Desktop `1440x900` rejection state (`US.SMCI` blocked by `R03, R05, R06, R10` with diagonal hazard stripes & saved drawdown banner).
  3. `03-desktop-counterfactual-ledger-1440px.png` — Desktop `1440x900` Counterfactual Rejection Ledger (`Tab 02`) with JSONL inspector.
  4. `04-desktop-regime-sector-matrix-1440px.png` — Desktop `1440x900` Market Regime simulator, 11-Sector SPDR RS table, and 8-row AA Playbook §08 Reconciler (`Tab 03`).
  5. `05-desktop-qca-fleet-packager-1440px.png` — Desktop `1440x900` QCA 4-Thread + Advisor roster, 3 Forward Mode schedules, and 12 downloadable `.zip` skills (`Tab 04`).
  6. `06-mobile-terminal-390px.png` & `07-mobile-ledger-390px.png` — Mobile `390x844` responsive layouts verified with `scrollWidth === clientWidth === 390` (zero horizontal overflow).
  7. `08-deployed-vercel-verified-1440px.png` — Live production deployment screenshot captured from `https://moomoo-x-qoder.vercel.app/` with `0` console/page errors.

---

## 5. Build, Test & Deployment Summary

- **Unit & Integration Test Suite (`npm test`):** `7/7 PASS` (`tests/engine.test.ts`).
- **Production Build (`npm run build`):** `tsc -b && vite build` succeeded cleanly in `474ms` (`dist/index.html` 1.38 kB, CSS 11.66 kB, JS 320.11 kB).
- **Secret Scan (`git ls-files`):** `0` secrets, `.env*`, `.momen-mcp/`, or credentials committed.
- **Live Deployments:**
  - **GitHub Repository:** https://github.com/Georgefifth/aegisgate-moomoo-qoder
  - **Vercel Production URL:** https://moomoo-x-qoder.vercel.app/ (Verified HTTP 200 & Playwright screenshot `08-deployed-vercel-verified-1440px.png`)
  - **GitHub Pages URL:** https://georgefifth.github.io/aegisgate-moomoo-qoder/
- **Known Limitations:**
  - Live order execution against the participant's personal Moomoo competition account (`SIM-COMP-*`) requires the participant's local `moomoo auth login` OAuth session or QCA Vault OAuth token (`https://mcp.moomoo.com/mcp`), which by competition security rules is never embedded in a public web bundle. AegisGate outputs exact copy-paste `moomoo sim` CLI commands, QCA `.zip` skill packages, and Forward Mode schedule payloads for zero-credential-leak execution.
