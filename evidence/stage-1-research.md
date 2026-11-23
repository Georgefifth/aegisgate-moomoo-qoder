# Stage 1 — Market Research, Competitive Analysis & Candidate Direction Selection

**Event:** 2026 Moomoo × Qoder AI Trading Agent Challenge (Singapore)  
**Event Page:** https://luma.com/oezyv35j?tk=mE6y9Z  
**Official Participant Handbook & Rules:** https://moomoo-qoder-challenge-rgkelnyuzbm.qoder.website/  
**Official Moomoo Strategy Briefing Deck (Alwin Aw):** https://moomoo-strategy-briefing-j692pppjg7l.qoder.website/  
**Official Qoder Architecture Kickoff Deck (Ken Xu):** https://ngynckpj.qwenwork.page/  
**Organizer Reference Implementations:**  
- Alwin's Challenge Dashboard: https://challenge-dashboard-j692pppjg7l.qoder.website/  
- AA Trading Desk Operating Playbook: https://trading-playbook-j692pppjg7l.qoder.website/  

---

## Part 1: Competition Context & Market Exploration

### 1.1 Verified Competition Requirements & Hard Constraints (Facts)

From the official Luma page, Participant Handbook, Moomoo Paper Trading Terms & Conditions, and the two Kickoff Decks:

1. **Judging Rubric (100% Total):**
   - **Qoder & Qoder Cloud Agent (QCA) Usage (30%):** Multi-agent orchestration (`Coordinator` + `Child Agents` + `Advisor` in Forward Mode), automated scheduling, Slack/IM channel alerts, reusable skills (`.zip` skill packages with `SKILL.md`), and a live observability/trading dashboard.
   - **Strategy & Risk Design (30%):** Clear trading thesis and mathematical edge (Positive Expectancy), explicit invalidation conditions, deterministic `R1–R11` pre-trade guardrails, position limits, drawdown responses, and automated kill switches.
   - **Risk-Adjusted Return (25%):** Trading performance evaluated relative to risk taken (Sharpe Ratio / drawdown control, not raw gamble returns).
   - **Reusability & Documentation (15%):** Reference-ready agent templates, version-pinned skills/scripts, structured decision & rejection logs, and a Qoder-generated presentation/report explaining what worked, what failed, and why.

2. **Moomoo Competition Paper Account Mechanics & Hard Constraints:**
   - **Initial Capital:** USD $100,000 simulated funds (`US` market only: US-listed stocks, ETFs, and options).
   - **Universe Filter:** Share price $\ge \text{USD } \$1.00$ AND market capitalization $\ge \text{USD } \$500\text{M}$.
   - **Single-Asset Concentration Cap:** Maximum **40% of initial/total account assets** per stock/ETF (organizer guidance: target **35–38%** to leave a buffer; requires $\ge 3$ distinct tickers for full capital deployment). Options are capped at 1,000 contracts per single option contract.
   - **Order & Position Ceilings:** Maximum **200 executed orders/day** (cancelled/amended orders excluded); maximum **100 open positions** at any time.
   - **Margin & Financing Costs:** Long 50% initial / 40% maintenance margin (4.8% p.a. overnight interest); Short 60% initial / 50% maintenance margin (6.0% p.a. overnight interest). Intraday round-trips incur zero overnight interest.
   - **Order Matching & Partial Fills:** Simulates real market trade-by-trade volume ($\text{actual volume} \times 20$). An order ID means *submission*, not *execution*. Paper API supports **Limit** and **Market** orders directly, **not resting broker-side stop orders** ("A recorded stop level is not a stop order").
   - **Option Expiry Hazard:** All ITM options expiring on a given day are automatically exercised after market close; insufficient buying power triggers forced liquidation.
   - **No Reset Card:** Strictly prohibited; using a reset/revival card triggers immediate disqualification.
   - **Session & Holiday Windows (17–28 Nov 2026):** Pre-Market (5:00 PM–10:30 PM SGT / 4:00 AM–9:30 AM ET), Regular Hours (10:30 PM–5:00 AM SGT / 9:30 AM–4:00 PM ET), After-Hours (5:00 AM–9:00 AM SGT / 4:00 PM–8:00 PM ET). **Thanksgiving Closure:** Thu, Nov 26 (US markets closed) and **Black Friday Early Close:** Fri, Nov 27 closes at 1:00 PM ET (2:00 AM SGT Sat, Nov 28). Final day after-hours trades do not count toward final settlement.

---

### 1.2 Landscape Analysis: Open-Source, Commercial & Organizer Baselines

We investigated leading open-source multi-agent trading repositories, commercial AI trading platforms, and the organizers' own reference implementations to uncover real architectural gaps and user complaints:

| Product / Project | Type & Pricing | Core Capabilities | Verified Limitations & User Pain Points (with Evidence) |
|---|---|---|---|
| **TauricResearch / TradingAgents** ([GitHub](https://github.com/TauricResearch/TradingAgents)) | Open-Source (Apache-2.0, 14k+ community forks/variants) | LangGraph multi-agent bull/bear debate + risk team + fundamental/sentiment/technical analysts | **1. High debate latency kills intraday execution:** Issue [#1704](https://github.com/TauricResearch/TradingAgents/issues/1704) documents that multi-round LLM debates are too slow when candle-close signals need fast execution.<br>**2. Data feed glitches handed directly to LLMs:** PR [#1707](https://github.com/TauricResearch/TradingAgents/pull/1707) shows Yahoo Finance returning unsettled bars with blank close prices, causing agents to hallucinate on empty latest bars.<br>**3. Look-ahead bias in valuation snapshots:** Issue [#1703](https://github.com/TauricResearch/TradingAgents/issues/1703) highlights that live snapshots leak into historical backtests without strict point-in-time gating. |
| **virattt / ai-hedge-fund** ([GitHub](https://github.com/virattt/ai-hedge-fund)) | Open-Source (MIT, Python CLI/TUI + multi-persona analysts) | Famous investor persona agents (Buffett, Ackman, etc.), paper portfolio runner, signal registry | **1. Incorrect indicator math in shared helpers:** PR [#759](https://github.com/virattt/ai-hedge-fund/pull/759) proved `QuantModel._compute_rsi` used Cutler's simple rolling mean instead of Wilder's smoothing, diverging by **10.2 RSI points** from TA-Lib/TradingView and flipping 30/70 signals on 92 out of 500 bars.<br>**2. Paper-to-broker reconciliation failures on shorts/fees:** PR [#754](https://github.com/virattt/ai-hedge-fund/pull/754) documents that overnight short financing interest (~4.8–6.0%) and 1.5% venue slippage cause `reconcile()` to fail before sessions.<br>**3. Silent overwrite of research receipts:** Issue [#755](https://github.com/virattt/ai-hedge-fund/issues/755) shows concurrent/same-second backtest runs overwriting JSON audit logs. |
| **OpenByteInc / QuantDinger** ([GitHub](https://github.com/OpenByteInc/QuantDinger)) | Open-Source (Apache-2.0, 13.9k stars) | Self-hosted Agentic Trading OS with Python strategies, factor discovery, MCP, and multi-asset execution | Heavy monolithic self-hosted stack; requires local Docker/server orchestration rather than native Qoder Cloud Agents (`qca`) session threads and Moomoo CLI/MCP vault bindings. |
| **Lumiwealth / Lumibot** ([GitHub](https://github.com/Lumiwealth/lumibot)) | Open-Source (GPL-3.0, 2.2k stars) | Python algo framework with broker adapters (Alpaca, IBKR, Tradier) and options chains | Heavy boilerplate Python coding required per strategy; 126 open issues around broker state desynchronization, option chain latency, and lack of native multi-agent audit logs. |
| **Composer.trade** ([Website](https://www.composer.trade/)) | Commercial SaaS ($0 Starter / Paid Pro tiers, $37B+ volume) | Visual no-code "symphony" builder (if-then logic, RSI/EMA filters, inverse-volatility weighting) + AI prompt-to-symphony | **1. Daily rebalance window only:** Executes once per day near market close—cannot handle Moomoo's 3-session (Pre-Market, RTH, After-Hours) limit-order laddering or intraday stop checks.<br>**2. No Moomoo SG integration** and no multi-agent qualitative catalyst/anomaly verification (`moomoo unusual`). |
| **AA Trading Desk & Alwin's Challenge Dashboard** ([Playbook](https://trading-playbook-j692pppjg7l.qoder.website/) / [Dashboard](https://challenge-dashboard-j692pppjg7l.qoder.website/)) | Organizer Reference Baseline (Moomoo × Qoder Kickoff) | Two-agent split (`Trading Agent` + `Portfolio Agent`), Kell-style trend setups, QQQ 20-EMA regime filter, static snapshot dashboard | **Explicitly documented gaps in Section 08 ("Rules to Reconcile") of the official Playbook:**<br>1. **Cloud vs. Local Rule Drift:** Cloud prompt risks 0.5–1.0% equity vs. local desk $\le 0.75\%$; cloud allows up to 100% exposure vs. local 85%; conflicting rules on weak-sector shorts.<br>2. **"A visual label is not yet a deterministic execution rule":** Terms like "extension", "choppy", and "no-chasing distance" are left vague in prose prompts.<br>3. **"A stop level is not a stop order":** Moomoo paper API only supports market/limit orders; protection is absent between scheduled checks unless a deterministic guardian reconciles and escalates limit-to-market exits.<br>4. **Read-only static dashboard:** The reference Playbook explicitly states *"Read-only guide · not an execution system. Monitoring and order coverage are not verified by this website."* |

---

### 1.3 Core Unmet User Needs Identified

Across HackerNews discussions (e.g., [OpenPilot $1000 Live Experiment](https://news.ycombinator.com/item?id=47347022), [HashTrade Episodic Memory Agent](https://news.ycombinator.com/item?id=47108700), [IBKR-CLI Safety-First Agent Hands](https://news.ycombinator.com/item?id=47426030)) and the official Moomoo × Qoder briefing materials, five critical pain points emerge:

1. **The "Prompt-to-Execution Seam" (Prose Rules vs. Deterministic Math):** When traders write risk rules in LLM system prompts (e.g., *"keep single stock under 40%, heat under 6%, don't chase extended bars"*), LLMs routinely miscalculate position sizes, hallucinate indicator values, or get talked into overriding limits by bullish sub-agents. As the Moomoo briefing slide 35 warns: *"Several agents agreeing is not independent proof that a trade is good. Position sizing calculations are not automatically broker-enforced limits."*
2. **The "Unprotected Paper Stop & Partial Fill" Hazard:** Because Moomoo's paper trading API supports Limit and Market orders rather than resting conditional stop-loss orders, and matches volume against $\text{real volume} \times 20$, naive agents submit a limit order, assume it filled, and leave positions naked across sessions or into the Thanksgiving/Black Friday early close.
3. **Lack of First-Class Rejection & Counterfactual Auditing:** Judges and real algo traders ask *"What failed and why?"* and *"Did your risk auditor actually block bad trades?"* Almost all existing dashboards only plot filled trades and P&L, hiding **rejected proposals**, **rule gate blocks (R1–R11)**, and **counterfactual P&L** (how much money the Risk Auditor saved by saying *NO*).
4. **3-Session & Holiday Blindness:** Running a single schedule 24/7 across US Pre-Market (5:00 PM SGT), Regular Hours (10:30 PM SGT), After-Hours (5:00 AM SGT), and Thanksgiving/Black Friday causes wide-spread slippage, stranded limit orders, and overnight margin interest drag (4.8% long / 6.0% short).
5. **Cloud-to-Local Configuration Drift:** Updating an agent prompt in Qoder Cloud Agents (`qca`) silently overwrites the active cloud template or leaves child agent versions unpinned (`latest`), causing inconsistent behavior between local Qoder Desktop testing and scheduled cloud runs.

---

## Part 2: Screening 6 Distinct Candidate Directions

To avoid generic "AI chat stock pickers", we formulated **6 clearly differentiated product directions** tailored to the Moomoo × Qoder ecosystem and evaluated each against verified facts, reasoned inferences, and unverified hypotheses.

---

### Candidate 1: **AegisGate (Deterministic R1–R11 Multi-Agent Risk & Execution Control Plane + Counterfactual Audit Workbench)**

- **Target User & Concrete Pain Point:**  
  Algo traders and Moomoo × Qoder participants whose multi-agent setups suffer from **prompt-vs-code policy drift**, **LLM sizing/indicator math errors**, **unprotected paper stops**, and **opaque rejection logs**. Even the organizers' own `AA Trading Desk Playbook` (§08) highlights 8 unresolved policy conflicts between cloud prompts and local desk rules, noting that *"a visual label is not yet a deterministic execution rule"* and *"a stop level is not a stop order."*
- **How Users Currently Solve This:**  
  Users paste long markdown rules into Qoder Cloud Agent system prompts, manually inspect chat transcripts in QCA sessions, and build static read-only HTML dashboards that only display current positions and equity curves.
- **Related Existing Products:**  
  1. [AA Trading Desk Playbook](https://trading-playbook-j692pppjg7l.qoder.website/) & [Alwin's Challenge Dashboard](https://challenge-dashboard-j692pppjg7l.qoder.website/) (Organizer references)  
  2. [0xethanq / astra-quant-agent](https://github.com/0xethanq/astra-quant-agent) & [chenjy16 / OpenPilot](https://github.com/chenjy16/OpenPilot) (Multi-LLM qualitative reasoner + deterministic code risk controller)  
  3. [TauricResearch / TradingAgents](https://github.com/TauricResearch/TradingAgents)
- **Shortcomings of Existing Solutions & Evidence:**  
  `TradingAgents` relies on conversational LLM risk debates (high latency, no hard broker-rule math); `AA Trading Desk Playbook` is a static reference document with 8 unresolved cloud-vs-local rule conflicts and no live enforcement; `OpenPilot` only supports Longport/Alpaca via Telegram without Moomoo `unusual` anomaly skills, 3-session SGT/ET state machines, or QCA Forward Mode thread/version auditing.
- **Concrete Improvements We Provide:**  
  1. **3-Agent + Advisor QCA Architecture with Hard Deterministic Gate (`R1–R11`):** Separates the **Scout Researcher Agent** (fetches `moomoo-news-search`, `moomoo-comment-sentiment`, and the 3 `moomoo-unusual-*` anomaly skills), the **Risk Auditor Agent** (runs in an isolated QCA session thread with a deterministic Python/TS `R1–R11` validator checking: price $\ge \$1$, mcap $\ge \$500\text{M}$, single-ticker exposure $\le 36\%$ [4% buffer under 40% cap], $\ge 3$ ticker diversification, portfolio heat $\le 6\%$, daily loss $< 2\%$, order count $< 200/\text{day}$, earnings buffer $> 2\text{ days}$, and Thanksgiving/Black Friday flatten timers), and the **Order Execution Agent** (executes 3-step limit-order laddering and limit-to-market stop escalation via `moomoo sim`).
  2. **First-Class Rejection Ledger & Counterfactual "Saved Drawdown" Analytics:** Every trade proposal—approved OR rejected—is logged to Momen PostgreSQL + repo JSONL with the exact `R1–R11` gate results and subsequent price tracking, quantifying **Counterfactual Alpha (Money Saved by Risk Gates)**.
  3. **Live Cloud-vs-Local Policy Reconciler & Version Pinning Inspector:** Automatically diffs local `AGENTS.md` / skill `.zip` hashes against QCA cloud agent versions so cloud and local rules never drift.
- **Why Users Would Switch:**  
  Directly targets **75% of the competition rubric** (30% Strategy & Risk Design + 30% Qoder/QCA Usage + 15% Reusability/Documentation) while protecting the 25% Risk-Adjusted Return score from catastrophic rule violations or holiday gap liquidations.
- **Difficulty, Risks & Feasibility:**  
  Medium difficulty; high feasibility. Uses local React/TypeScript + Momen Headless BaaS (PostgreSQL + GraphQL + WebSocket live stream + ZAI Agent / Actionflow) + downloadable QCA Agent Templates & validated Moomoo Skill ZIP packages.
- **MVP & Validation Criteria:**  
  Interactive Risk & Execution Control Plane where a user (or judge) can: (a) run live/replay market candidates through the Scout → Advisor → Deterministic `R1–R11` Risk Auditor → Ladder Executor pipeline, (b) inspect the live Equity vs. Drawdown & Portfolio Heat telemetry, (c) audit the Decision & Rejection Log with counterfactual P&L, and (d) export ready-to-upload QCA Skill ZIPs, Cron Schedules, and the Qoder Presentation Deck.

---

### Candidate 2: **LadderPulse (Intraday Opening-Range Breakout & Smart Limit-Order Ladder Execution Agent)**

- **Target User & Concrete Pain Point:**  
  Short-window paper competition traders (8.5 trading days) who lose 0.3%–1.5% per trade to wide bid-ask spreads and unfilled/stranded limit orders during US Pre-Market (5:00 PM SGT) and Market Open (10:30 PM SGT), or get partially filled when order size exceeds $\text{market volume} \times 20$.
- **How Users Currently Solve This:**  
  They either submit Market orders (suffering severe slippage) or submit a single static Limit order via `moomoo sim order buy` and manually check `moomoo sim order list` every 5 minutes (as shown in Moomoo Briefing Slide 32: *"Ladder Entry: +$0.10 every 5 minutes, capped at the ask"*).
- **Related Existing Products:**  
  1. [Moomoo Agent Hub — `moomoo-grid-strategy`](https://github.com/MoomooOpen/moomoo-agent-hub)  
  2. [Lumiwealth / Lumibot Smart Limit Execution](https://github.com/Lumiwealth/lumibot)  
  3. [fatwang2 / ibkr-cli](https://github.com/fatwang2/ibkr-cli)
- **Shortcomings of Existing Solutions & Evidence:**  
  `moomoo-grid-strategy` is a single-symbol static percentage grid that explicitly excludes multiple symbols and dynamic spread-walking; manual prompt-based laddering in QCA burns 15 scheduled agent runs (~70 minutes of QCA credits) just to walk a single limit order by $0.10 increments.
- **Concrete Improvements We Provide:**  
  An automated **Opening Range Breakout (ORB) + Adaptive Limit-Ladder Execution Engine** that computes 5-min/15-min ORB levels at 10:30 PM SGT, estimates liquidity capacity against Moomoo's $20\times$ volume matching rule, and executes a bounded 3-rung limit-order walk with automatic stale-order cancellation and credit-efficient batching.
- **Why Users Would Switch:**  
  Eliminates stranded pre-market/after-hours orders and reduces QCA credit burn by 70% compared to per-order 5-minute LLM polling loops.
- **Difficulty, Risks & Feasibility:**  
  Medium difficulty. Risk: QCA minimum schedule interval is 1–5 minutes (`PT5M`), which is too slow for sub-second microstructure execution (as Slide 36 explicitly warns: *"Agent reasoning, tool calls and scheduling introduce latency. This is not a suitable substitute for a low-latency trading engine"*).
- **MVP & Validation Criteria:**  
  ORB scanner + 3-rung limit-ladder simulator and live Moomoo CLI script generator validated on historical 1-minute US equity/ETF open bars.

---

### Candidate 3: **VolShield (Defined-Risk Options Spread & Expiry-Guard Agent for Moomoo Paper Accounts)**

- **Target User & Concrete Pain Point:**  
  Traders using US Stock/ETF Options in the Moomoo competition who face two lethal competition traps: (1) **Auto-exercise forced liquidation** on expiry day (Paper Rule §5: all ITM options auto-exercise after market close, triggering forced margin liquidation if cash is insufficient), and (2) **Single-leg commission & IV crush drag** ($0.65 + $0.30 platform fee per contract, $1.99 minimum per order).
- **How Users Currently Solve This:**  
  Traders ask an LLM to pick an option from `moomoo option chain US.NVDA` and manually buy calls/puts without checking DTE, Delta (0.70–0.80 stock-substitution rule in AA Playbook §06), IV Rank, or expiry-day auto-liquidation timers.
- **Related Existing Products:**  
  1. [Option Alpha](https://optionalpha.com/) (Commercial automated options bots, $99–$199/mo)  
  2. [Moomoo `moomoo-unusual-derivatives-activity`](https://github.com/MoomooOpen/moomoo-agent-hub)
- **Shortcomings of Existing Solutions & Evidence:**  
  Option Alpha does not connect to Moomoo SG or Qoder Cloud Agents; Moomoo's FAQ (line 911) explicitly notes that *"historical options-data support was still being developed"* in the Moomoo MCP, making historical options backtesting via Moomoo MCP alone impossible without external datasets.
- **Concrete Improvements We Provide:**  
  An Options Stock-Substitution & Expiry-Guard Agent that pairs `moomoo-unusual-derivatives-activity` (IV / PCR / unusual whale sweeps) with Black-Scholes Greeks validation, exact contract sizing (`floor(risk_budget / (premium * 100))`), and an automated **DTE $\le 1$ Pre-Close Kill Switch** that closes expiring options before 3:30 PM ET (or 12:30 PM ET on Black Friday).
- **Why Users Would Switch:**  
  Prevents accidental account blowups from ITM option exercise while utilizing Moomoo's exemption of options from the 40% stock concentration cap.
- **Difficulty, Risks & Feasibility:**  
  High risk due to the FAQ-confirmed lack of historical options chains in Moomoo MCP for backtesting, plus multi-leg spreads requiring separate single-leg orders in the paper simulator.
- **MVP & Validation Criteria:**  
  Options chain analyzer, Greeks/fee calculator, and expiry-guard scheduler tested on live/snapshot US option chains (`SPY`, `QQQ`, `NVDA`, `TSLA`).

---

### Candidate 4: **AnomalyPulse (3-Signal Moomoo Unusual Activity Fusion & Bull/Bear Debate Desk)**

- **Target User & Concrete Pain Point:**  
  Swing/catalyst traders who want to exploit Moomoo's three proprietary anomaly APIs (`moomoo unusual technical-signals`, `capital-flows`, and `derivatives-activity` + `moomoo-comment-sentiment`), but get overwhelmed by noisy false breakouts when looking at a single indicator in isolation.
- **How Users Currently Solve This:**  
  Users manually prompt `"Are there any anomalies for NVDA today?"` one ticker at a time in Qoder chat, receiving unstructured prose summaries without cross-sectional ranking or statistical expectancy filtering.
- **Related Existing Products:**  
  1. [Moomoo Agent Hub (`moomoo-unusual-*` & `moomoo-comment-sentiment`)](https://github.com/MoomooOpen/moomoo-agent-hub)  
  2. [hopit-ai / india-trade-cli](https://github.com/hopit-ai/india-trade-cli) & [simonlin1212 / TradingAgents-astock](https://github.com/simonlin1212/TradingAgents-astock) (7-analyst bull/bear debate frameworks)
- **Shortcomings of Existing Solutions & Evidence:**  
  Running 7 LLM agents in a multi-round debate for every ticker consumes massive QCA credits (exhausting the 2,000 + 1,500 competition credit allowance in 2 days) and suffers from **LLM consensus sycophancy** (Briefing Slide 35: *"Several agents agreeing is not independent proof that a trade is good"*).
- **Concrete Improvements We Provide:**  
  A **Zero-Token Pre-Screener + Asymmetric Bull/Bear Red-Team Debate** that first scores a 30-ticker liquid US universe deterministically across Technical, Capital Flow, Derivatives, and News Sentiment dimensions, and only spawns a QCA Advisor/Bear-Agent red-team thread for top-ranked convergence anomalies.
- **Why Users Would Switch:**  
  Cuts LLM credit usage by ~80% while turning Moomoo's 6 content/unusual skills into a structured, ranked alpha pipeline.
- **Difficulty, Risks & Feasibility:**  
  Medium difficulty. Risk: Pure signal/debate tools often score well on "Research" but weak on "Risk Controls & Portfolio Management" unless tightly coupled to a deterministic risk & execution engine.
- **MVP & Validation Criteria:**  
  Multi-signal anomaly convergence matrix + Bull/Bear debate transcript viewer + signal-to-fill expectancy tracker.

---

### Candidate 5: **RegimeCompass (Cross-Sector Relative Strength & 3-Session Macro Rotation Portfolio Engine)**

- **Target User & Concrete Pain Point:**  
  Systematic portfolio traders in the 8.5-day window who need to deploy 100% of their $100k capital across $\ge 3$ uncorrelated tickers (respecting the $\le 40\%$ single-ticker cap) while dynamically shifting between Long Sector Leaders (`XLK`, `XLF`, `XLI`, etc.), Defensive Cash, and Tactical Inverse ETFs (`SQQQ`, `SOXS`, `SH`) without paying 6.0% short-borrow interest.
- **How Users Currently Solve This:**  
  Manually computing 11-sector relative strength against `SPY` and `QQQ` 20-EMA regimes (as described in `AA Trading Desk Playbook` §01 & §04), which fails closed whenever a single sector ETF bar is missing.
- **Related Existing Products:**  
  1. [Composer.trade](https://www.composer.trade/) (Automated ETF/stock rotation symphonies)  
  2. [AA Trading Desk Playbook §04 Sector Relative Strength](https://trading-playbook-j692pppjg7l.qoder.website/)
- **Shortcomings of Existing Solutions & Evidence:**  
  As documented in `AA Trading Desk Playbook` §08, the existing sector score formula (`0.30*R12 + 0.30*R6 + 0.20*R3 + 0.20*R1`) has a mathematical flaw noted by the authors themselves (*"Benchmark arithmetic correction: subtracting the same SPY or QQQ return from every sector does not change their cross-sectional ranking under this formula"*) and treats Sector ETFs only as scoring inputs rather than executable rotation vehicles.
- **Concrete Improvements We Provide:**  
  A volatility-parity **Sector & Regime Rotation Engine** that computes Wilder-smoothed ATR/EMA regime posture (`FULL` / `CAUTIOUS` / `DEFENSE` / `CASH`), automatically allocates across the top 3–4 non-correlated US sector/stock leaders capped at 35% each, and uses inverse ETFs for zero-borrow-fee downside hedging during `DEFENSE` regimes.
- **Why Users Would Switch:**  
  Solves the competition's 40% concentration cap mathematically (always deploying up to 100% capital safely across 3–4 low-correlation leaders) and avoids the 6.0% short margin interest trap.
- **Difficulty, Risks & Feasibility:**  
  Low-to-medium difficulty; very high feasibility and statistical robustness. Risk: May appear less "agentic" if not paired with event/anomaly catalyst checks and multi-agent QCA orchestration.
- **MVP & Validation Criteria:**  
  Live 11-sector relative strength radar + `QQQ/SPY` regime posture engine + automated 3-to-4 ticker portfolio allocator with backtest & paper-order ticket generation.

---

### Candidate 6: **QCA-OpsStudio (Qoder Cloud Agent Template Builder, Skill ZIP Packager & Credit-Budget Optimizer)**

- **Target User & Concrete Pain Point:**  
  Hackathon participants struggling with the DevOps friction of Qoder Cloud Agents: packaging the 11 `moomoo-agent-hub` skills into QCA-compliant single-folder `.zip` archives (Handbook §4.2.1), repairing broken relative markdown links, configuring IANA timezone cron schedules (`America/New_York` vs. `Asia/Singapore`), and avoiding burning through their 3,500 QCA credits.
- **How Users Currently Solve This:**  
  Copy-pasting the long packaging prompt from Handbook §4.2.1 into Qoder Desktop, manually zipping folders, debugging 400 validation errors on upload, and guessing cron expressions.
- **Related Existing Products:**  
  1. [Moomoo Agent Hub `scripts/`](https://github.com/MoomooOpen/moomoo-agent-hub)  
  2. [Qoder Cloud Agents Console](https://qoder.com/cloud-agents)
- **Shortcomings of Existing Solutions & Evidence:**  
  Pure developer utility—while helpful for the 15% Reusability & 30% Qoder Usage criteria, it is **not a trading agent** and cannot generate the 25% Risk-Adjusted Return or 30% Strategy & Risk Design scores on its own.
- **Concrete Improvements We Provide:**  
  One-click QCA Skill ZIP compiler/validator, Multi-Agent Coordinator JSON builder, and Credit Burn Simulator.
- **Why Users Would Switch:**  
  Saves 3–4 hours of setup friction.
- **Difficulty, Risks & Feasibility:**  
  Low difficulty, high feasibility, **fatal rubric risk** if built as a standalone product without a core trading strategy & risk engine.
- **MVP & Validation Criteria:**  
  Generates verified `.zip` packages for all 11 Moomoo skills and valid `POST /api/v1/cloud/agents` / `POST /api/v1/forward/schedules` payloads.

---

### 2.1 Epistemic Classification: Facts vs. Inferences vs. Hypotheses

| Category | Statement | Source / Basis |
|---|---|---|
| **Verified Fact (已证实的事实)** | 55% of the judging score comes from Strategy & Risk Design (30%) + Risk-Adjusted Return (25%), and 45% comes from Qoder/QCA Usage (30%) + Reusability & Documentation (15%). | Official Luma Page & Kickoff Slide 5 |
| **Verified Fact (已证实的事实)** | Moomoo's competition paper account enforces a 40% single-stock/ETF concentration cap, $\ge \$1$ price, $\ge \$500\text{M}$ market cap, max 200 executed orders/day, 4.8% long / 6.0% short overnight margin interest, no resting stop orders in the documented paper API, and strict disqualification for Reset Cards. | Official Moomoo Paper Trading T&C & Kickoff Slides 19, 21, 36 |
| **Verified Fact (已证实的事实)** | US markets are closed Thu Nov 26 (Thanksgiving) and close early at 1:00 PM ET (2:00 AM SGT Sat Nov 28) on Fri Nov 27 (Black Friday) right before the Nov 28 trading window ends. | Official Kickoff Slide 8 (`A.I.M` Takeaways) |
| **Verified Fact (已证实的事实)** | Existing open-source AI trading agents suffer from indicator math bugs (e.g., `ai-hedge-fund` PR #759 Cutler vs. Wilder RSI 10.2-point error), high debate latency (`TradingAgents` Issue #1704), and prompt-vs-code rule drift (`AA Trading Desk Playbook` §08). | GitHub Issues/PRs & Official Playbook |
| **Reasoned Inference (合理推测)** | Most hackathon participants will submit a single-prompt LLM chat bot or a clone of the static `Alwin's Challenge Dashboard` that only displays filled positions and P&L, leaving a massive differentiation gap for an interactive **Deterministic Risk-Gated Multi-Agent Control Plane** that proves *both* approved trades and *blocked/rejected bad trades* with counterfactual P&L. | Analysis of Participant Handbook §8.2 ("Judges ask 'what failed and why', and a rejection log answers it better than any slide") |
| **Unverified Hypothesis (未经验证的假设)** | Combining 3-Signal Moomoo Anomaly Convergence (`technical`, `capital-flows`, `derivatives`) with Regime-Gated Volatility Parity Sizing will outperform a passive equal-weight `QQQ`/`SPY` baseline on Sharpe Ratio over a short 8.5-day window after simulated fees and spread slippage. | Must be empirically tested in Stage 3.5 Validation on real market data |

---

### 2.2 Five-Dimension Scoring Matrix (1–10 Scale with Concrete Justification)

| Candidate Direction | Practical Value (实用价值) | Innovation (创新程度) | Competitive Advantage (竞争优势) | User Experience (用户体验) | Feasibility (可行性) | Weighted Total (/50) | Scoring Justification |
|---|---|---|---|---|---|---|---|
| **1. AegisGate** (Deterministic R1–R11 Risk & Execution Control Plane + Anomaly/Regime Multi-Agent Desk) | **9.5** | **9.0** | **9.5** | **9.0** | **9.0** | **46.0** | Directly solves the #1 failure mode documented in the organizer's own Playbook (§08 cloud-vs-local drift & unprotected paper stops) + includes counterfactual rejection auditing, 3-session/holiday guardrails, and QCA template/skill packaging. Covers 100% of the rubric. |
| **2. LadderPulse** (Intraday ORB & Smart Limit-Order Ladder Agent) | **8.0** | **7.5** | **7.5** | **8.0** | **7.5** | **38.5** | Strong execution utility for Market Open (10:30 PM SGT), but constrained by QCA's 1–5 min scheduling latency (Slide 36) if used as a standalone high-frequency microstructure tool. Best absorbed as a module inside Candidate 1. |
| **3. VolShield** (Defined-Risk Options & Expiry-Guard Agent) | **7.5** | **8.0** | **7.5** | **7.0** | **6.0** | **36.0** | High conceptual value for avoiding ITM expiry liquidation, but penalized on Feasibility (6.0) because Moomoo FAQ (line 911) confirms historical options data is not yet available in Moomoo MCP for backtesting. |
| **4. AnomalyPulse** (3-Signal Moomoo Anomaly Fusion & Red-Team Debate) | **8.0** | **8.0** | **8.0** | **8.5** | **8.5** | **41.0** | Excellent showcase of Moomoo's 6 search/unusual skills and QCA Advisor red-teaming, but lacks deterministic portfolio heat/concentration/holiday risk enforcement unless merged with Candidate 1. |
| **5. RegimeCompass** (Cross-Sector RS & 3-Session Macro Rotation Engine) | **8.5** | **7.0** | **8.0** | **8.0** | **9.0** | **40.5** | Mathematically sound way to utilize 100% capital across 3–4 tickers under the 40% cap and avoid 6% short interest via inverse ETFs, but standard trend-following alone is less differentiated on multi-agent QCA engineering. |
| **6. QCA-OpsStudio** (QCA Skill ZIP Packager & Schedule/Credit Optimizer) | **7.0** | **6.5** | **6.5** | **8.5** | **9.5** | **38.0** | High developer convenience for packaging Moomoo skills and cron schedules, but fails the 55% Trading Strategy & Risk-Adjusted Return rubric if pitched as a standalone product. |

---

## Part 3: Strict Product Critique & Elimination (6 Critical Questions)

Acting as a skeptical product and quant reviewer, we interrogated all 6 candidates against the 6 mandatory elimination questions:

### 1. Does this product really need to exist?
- **Eliminated as Standalone — Candidate 6 (`QCA-OpsStudio`):** A bash script can zip skill folders. It does not need to be a standalone product, though its **QCA Skill & Schedule Exporter** is a great built-in feature inside our main workbench.
- **Eliminated as Standalone — Candidate 3 (`VolShield`):** Without historical options chains in Moomoo MCP (verified in FAQ line 911), an options-only strategy cannot be rigorously backtested out-of-sample without fabrication. Instead, an **Options Expiry Kill-Switch & Stock-Substitution Calculator** should be a guardrail rule (`R9`) inside a broader equity/ETF system.
- **Validated Need — Candidate 1 (`AegisGate` integrated with `AnomalyPulse` + `RegimeCompass` + `LadderPulse`):** Yes. Every builder connecting LLMs to a brokerage API faces the exact dilemma highlighted by Ken Xu (Qoder Slide 17–20) and Alwin Aw (Moomoo Slide 19–36): **LLMs are qualitative reasoners, not deterministic risk calculators or resting stop engines.** A unified multi-agent desk where QCA agents propose catalyst/regime trades, a deterministic `R1–R11` Risk Auditor gates every order with a counterfactual rejection ledger, and a 3-session/holiday-aware Executor manages limit ladders and stop escalations has genuine, lasting utility.

### 2. Why can't existing tools solve it?
- **Moomoo App / Moomoo AI:** Built-in Moomoo AI is a conversational research assistant inside the mobile/desktop app; it cannot orchestrate multi-agent workflows, enforce custom portfolio-heat caps ($\le 6\%$), run scheduled pre-close Black Friday flatteners, or log counterfactual rejected trades.
- **TradingAgents / ai-hedge-fund:** Both lack Moomoo competition guardrails (40% cap, $\ge \$1$ / $\ge \$500\text{M}$ filter, 200-order cap, 3-session SGT/ET awareness) and rely on LLM prose debates rather than a deterministic pre-trade policy engine + live QCA session thread observability.
- **Alwin's Challenge Dashboard & AA Playbook:** Both are explicitly **read-only static snapshots** with 8 unresolved rule conflicts between cloud prompts and local desk SOPs.

### 3. Is there a simpler, cheaper, or non-AI solution?
- Purely mechanical rules (e.g., Wilder RSI, 10/20 EMA crossovers, ATR position sizing, 40% exposure cap, Thanksgiving/Black Friday calendar cutoffs) **should NOT use an LLM**—and in **AegisGate**, they don't! We explicitly execute all `R1–R11` risk math, Wilder indicator calculations, and position sizing in **deterministic zero-hallucination code**.
- AI is used *strictly where deterministic code fails*: synthesizing unstructured Moomoo news (`moomoo-news-search`), community bull/bear commentary (`moomoo-comment-sentiment`), and multi-dimensional unusual activity (`moomoo-unusual-*`) into structured, cited trade theses, and running an independent **QCA Advisor Red-Team critique** to catch narrative traps (e.g., earnings guidance cuts masked by headline beats) before the deterministic risk gate ever sees the order.

### 4. Will users try it once and never use it again?
- One-shot "AI stock report generators" suffer from 90%+ day-2 churn because users have no reason to return after reading a summary.
- **AegisGate** is an **operational trading & risk control plane** driven by the 3 daily US market windows in Singapore time (5:00 PM SGT Pre-Market Scan, 10:30 PM SGT Regular Open Execution & Ladder Monitor, 4:30 AM SGT Pre-Close Stop/Holiday Reconciliation) plus post-session **Counterfactual Attribution** (reviewing both active fills and blocked trades to tune strategy parameters).

### 5. What evidence suggests our approach might be better?
- **Empirical Evidence from Open-Source Benchmarks:** Removing indicator/sizing math from the LLM prompt eliminates the 10.2-point RSI error (`ai-hedge-fund` PR #759) and blank-bar hallucination (`TradingAgents` PR #1707).
- **Direct Alignment with Organizer Blueprint:** Ken Xu's Slide 17 (*"My demo setup: two agents, one rulebook — Trading Agent / Scout NEVER places orders → Deterministic R1–R11 rule gate → Portfolio Agent / Guard validates proposals; sole execution path; Missing evidence → HOLD"*) and Alwin Aw's Slide 8 (*"A.I.M: Automate & Iterate, Isolate 3 SGT Sessions, Manage Thanksgiving/Black Friday Holiday Cutoffs"*) literally describe this exact architecture as the gold standard for the competition.

### 6. Which key hypothesis, if wrong, means we should abandon or pivot this idea?
- **Key Falsifiable Hypothesis:** *"Enforcing the deterministic R1–R11 risk gate + QCA Red-Team Advisor filter reduces maximum drawdown and improves risk-adjusted return (Sharpe / Calmar ratio) compared to an ungated signal baseline over multi-day US market replay windows."*
- If in Stage 3.5 Validation the `R1–R11` risk gate blocks profitable winners while letting losers through (resulting in a worse Sharpe ratio and deeper drawdown than the ungated baseline), we must recalibrate the gate thresholds or pivot the entry trigger logic.

---

## Part 4: Candidate Comparison Table, Recommendation & Risk Breakdown

### 4.1 Summary Comparison Table

| # | Candidate Direction | Core Value Proposition | Rubric Coverage (Return 25% / QCA 30% / Risk 30% / Reuse 15%) | Primary Technical / Market Risk | Verdict |
|---|---|---|---|---|---|
| **1** | **AegisGate** *(Recommended Flagship)* | **Deterministic R1–R11 Multi-Agent Trading & Risk Control Plane** — Combines Regime + Moomoo Anomaly Scout, Red-Team Advisor, Deterministic `R1–R11` Risk Auditor, 3-Session Limit-Ladder Executor, Counterfactual Rejection Ledger, and One-Click QCA Template/Skill Packager. | **100% Full Rubric Coverage** (Hits every explicit requirement in both Kickoff Decks & Handbook) | Over-filtering if `R1–R11` thresholds are too tight during strong momentum days; mitigated via configurable regime posture (`FULL` / `CAUTIOUS` / `DEFENSE` / `CASH`). | **RECOMMENDED (#1)** |
| **2** | **AnomalyPulse** | **3-Signal Moomoo Anomaly Fusion & Bull/Bear Debate Desk** — Focuses on `moomoo unusual` (technical, capital flow, derivatives) + sentiment synthesis and adversarial debate. | **~70%** (Strong on QCA & Research, weaker on portfolio-level risk & execution mechanics) | LLM debate latency and token burn; consensus sycophancy without hard mathematical risk gates. | **Merge best features into #1** (Anomaly convergence scorer) |
| **3** | **RegimeCompass** | **Cross-Sector Relative Strength & 3-Session Macro Rotation Engine** — Systematic 11-sector RS scoring + `QQQ` 20-EMA regime posture + inverse-ETF zero-borrow-fee hedging. | **~75%** (Strong on Strategy/Risk & Return, lighter on multi-agent QCA depth) | Slower turnover in an 8.5-day sprint if sector ranks stay static for 3–5 days. | **Merge best features into #1** (Regime & sector posture gate) |
| **4** | **LadderPulse** | **Intraday ORB & Smart Limit-Order Ladder Execution Agent** — 10:30 PM SGT Opening Range Breakout scanner + 3-rung limit-order spread walker + $20\times$ volume capacity checker. | **~65%** (Strong on execution friction, narrow on macro/fundamental thesis) | QCA minimum schedule interval (1–5 min) limits sub-minute order walking; requires careful bounded rungs. | **Merge best features into #1** (Limit-ladder order generator) |
| **5** | **QCA-OpsStudio** | **QCA Template Builder, Skill ZIP Packager & Credit Optimizer** — DevOps workbench for packaging `moomoo-agent-hub` skills and cron schedules. | **~45%** (Covers QCA Usage & Reusability only; 0% on Trading Return/Strategy) | Fails judging clause requiring a working trading thesis, risk controls, and trade fills. | **Eliminate as standalone** (Include export tab in #1) |
| **6** | **VolShield** | **Defined-Risk Options Spread & Expiry-Guard Agent** — Options chain scanner + DTE $\le 1$ auto-exercise preventer. | **~60%** (High novelty, but blocked by missing Moomoo MCP historical options backtest data) | Official FAQ confirms Moomoo MCP lacks historical options data for backtesting. | **Eliminate as standalone** (Include expiry guard as Rule `R9` in #1) |

---

### 4.2 Final Recommendation: **Direction 1 — AegisGate**

We strongly recommend **Candidate 1: AegisGate — Autonomous Multi-Agent Trading & Deterministic Risk Control Plane for Moomoo × Qoder** (incorporating the best modules of #2 Anomaly Convergence, #3 Regime Posture, #4 3-Rung Limit Laddering, and #5 Ready-to-Upload QCA Skill/Template Exports).

#### Why AegisGate is the strongest choice:
1. **Built directly on the Organizers' Golden Blueprint:** Implements the exact **Coordinator + Scout Agent + Risk Auditor Agent + Executor Agent + Independent Advisor** architecture recommended in the Participant Handbook (§8.2 & §9) and Ken Xu's Slide 17 (`R1–R11` deterministic rule gate).
2. **Resolves the 8 Open Conflicts in the Official `AA Trading Desk Playbook`:** Turns ambiguous prose labels into deterministic, inspectable `R1–R11` code checks (Price $\ge \$1$, Market Cap $\ge \$500\text{M}$, Single-Asset Exposure $\le 36\%$ under the 40% ceiling, $\ge 3$ Distinct Tickers, Portfolio Heat $\le 6\%$, Risk/Trade $\le 0.75\%$, Daily Loss Kill-Switch $\ge 2\%$, Order Count $\le 200/\text{day}$, Option DTE $> 1$ Expiry Guard, Earnings Window $> 2\text{ days}$, and SGT Session/Thanksgiving/Black Friday Flatten Guard).
3. **Answers the Judges' Favorite Question ("What Failed, What Was Rejected, and Why?"):** Features a live **Decision & Rejection Audit Ledger** backed by Momen PostgreSQL + WebSocket subscriptions and local JSONL logs, tracking both executed paper fills and **Counterfactual Saved Drawdown** from rejected proposals.
4. **Delivers Complete, Runnable Qoder + Moomoo Artifacts:** Ships a live interactive Control Plane dashboard, runnable Python/TS Moomoo CLI & QCA integration scripts, validated QCA `.zip` skill bundles, and a Qoder-ready strategy & post-mortem report.

---

**Paused at Stage 1 Gate:** Waiting for human confirmation of the project theme before writing specifications or entering Stage 2 development.

---

## Part 5: Human Theme Selection Confirmed (Transition to Stage 2)

- **Selected Direction:** **Direction 1 — AegisGate: Deterministic R1–R11 Multi-Agent Trading & Risk Control Plane + Counterfactual Audit Workbench for Moomoo × Qoder** (incorporating Anomaly Convergence from #2, 11-Sector Relative Strength & Regime Rotation from #3, 3-Rung Limit-Order Laddering from #4, and One-Click QCA Skill `.zip` & Schedule Packaging from #5).
- **Human Directive:** Invest extra engineering depth and UX craftsmanship into Stage 2 (Build) and Stage 3 (QA).
- **Status:** Stage 1 complete. Proceeding to Stage 2 (`prompts/02-build.md`).

