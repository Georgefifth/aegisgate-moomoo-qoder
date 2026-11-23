# Stage 4 — Technical Presentation Video, SVG Schematics & Interactive Slide Deck Report

**Product:** AegisGate — Deterministic `R01–R11` Multi-Agent Trading, Risk Auditing & Counterfactual Control Plane (2026 Moomoo × Qoder AI Trading Agent Challenge)  
**Rendered Video Output:** `evidence/stage-4-demo/demo.mp4` (`1920×1080`, `30 fps`, `H.264 + AAC`, `73.27 seconds`, `11.45 MB`, sidechain-ducked BGM + synchronized voice narration & captions)  
**Interactive 10-Slide Presentation Deck:** `public/deck.html` & `evidence/stage-4-demo/deck.html` (Live at `https://moomoo-x-qoder.vercel.app/deck.html` and `https://georgefifth.github.io/aegisgate-moomoo-qoder/deck.html`)  
**Editable SVG Schematics:** `evidence/stage-4-demo/assets/aegisgate_hero.svg` & `evidence/stage-4-demo/assets/aegisgate_architecture.svg`  
**Fact-Validated Storyboard & Facts Registry:** `planning/storyboard.json` & `project/facts.json` (`5` verified facts, `1` blocked unverified claim, `0` errors)

---

## 1. Visual Storytelling & Storyboard Architecture (`planning/storyboard.json`)

Using `~/tools/demo-recorder` (Remotion + React SVG + Playwright Live Capture + Edge-TTS + FFmpeg) with the `swiss` design preset matching our `01 // Swiss Brutalism` UI:

| Scene # | Scene ID & Visual Type | Duration | Visual Structure & Dynamic Camera/Annotation Choreography | Grounded Fact IDs |
|---|---|---|---|---|
| **01** | `opening` (`opening_title`) | `10.94s` | Swiss Brutalist title split + `aegisgate_hero.svg` control plane schematic + animated HUD reticle highlighting the `R01–R11` 11-guardrail matrix (`36% Cap`, `>=3 Tickers`, `<=6% Heat`, `Holiday Flatten`). | `fact_r1_r11_gate`, `fact_qca_12_skills_packaged` |
| **02** | `problem` (`problem_flow`) | `9.59s` | 4-Node Animated Bottleneck Flowchart (`Yahoo Glitch Bars [PR #1707]` $\rightarrow$ `Cutler RSI Math Bug [29.2pt Drift, PR #759]` $\rightarrow$ `Prompt Policy Drift [8 Conflicts, §08]` $\rightarrow$ `Forced Liquidation [No Reset Card]`) with timed node highlights (`★ 235 False Flips`, `★ 8 Rule Conflicts`). | `fact_wilder_vs_cutler_rsi`, `fact_r1_r11_gate` |
| **03** | `architecture` (`exploded_view`) | `8.54s` | 4-Layer Isometric Exploded Assembly (`Layer 01: Coordinator v4 + Advisor`, `Layer 02: Scout Researcher v2`, `Layer 03: Isolated Risk Auditor v3 [0.0066ms Gate]`, `Layer 04: Order Executor v2 [3-Rung Ladder]`) with animated layer separation and active focus callouts. | `fact_qca_12_skills_packaged`, `fact_r1_r11_gate` |
| **04** | `live_terminal` (`real_footage_with_annotations`) | `12.57s` | Real Playwright live capture (`https://moomoo-x-qoder.vercel.app/`) demonstrating `US.SMCI` being blocked by `R03, R05, R06, R10` (saving `+$6,348.55`), `US.SPY` 0DTE blocked by `R09`, and `US.NVDA` passing `11/11` with a 3-rung limit-order ladder. | `fact_r1_r11_gate`, `fact_playwright_36_36_qa` |
| **05** | `live_ledger_qca` (`real_footage_with_annotations`) | `10.84s` | Real Playwright live capture navigating through `02. Counterfactual Rejection Ledger` (`logs/decisions.jsonl`), `03. Regime & 11-Sector RS Matrix`, and `04. QCA Fleet & 12 Skill ZIP Packager`. | `fact_qca_12_skills_packaged`, `fact_playwright_36_36_qa` |
| **06** | `validation` (`technical_validation`) | `14.70s` | Animated empirical benchmark bar chart from Stage 3.5 (`190-Day Max Drawdown: 7.97% vs 27.22% baseline`, `Wilder RSI Accuracy: 100% vs 83.04% across 1,386 bars`, `Playwright Firefox QA: 100%`) + explicit **Scope Boundaries & Unverified Items** panel. | `fact_190d_backtest_drawdown`, `fact_wilder_vs_cutler_rsi`, `fact_r1_r11_gate` |
| **07** | `closing` (`closing_summary`) | `6.09s` | Closing summary card with live deployment URL (`moomoo-x-qoder.vercel.app`), `QA & FACT CHECK PASSED` stamp, and 3 key metric cards. | `fact_r1_r11_gate`, `fact_190d_backtest_drawdown`, `fact_qca_12_skills_packaged` |

---

## 2. Frame-by-Frame Visual Quality Inspection (`evidence/stage-4-demo/frames/`)

We extracted all 7 scenes at `1920×1080` via `ffmpeg` and inspected every frame using the `read` tool:
- `01-opening.png` — Verified crisp SVG schematic rendering, HUD highlight reticle over the `R01–R11` matrix, and legible subtitle bar.
- `02-problem-flow.png` — During initial inspection, the callout badge above `Cutler RSI Math Bug` had 39 characters and clipped slightly at the pill border; we shortened the callout to `"235 False Flips"` / `"8 Rule Conflicts"`, re-rendered `demo.mp4`, and verified in `02-problem-flow.png` that the badge is 100% centered and unclipped.
- `03-architecture-exploded.png` — Verified 4-layer isometric exploded stack with active orange highlight on `ISOLATED RISK AUDITOR (V3)` and leader line to Layer 03 card.
- `04-live-terminal-capture.png` & `05-live-ledger-qca-capture.png` — Verified real browser capture footage inside the frame with synchronized step sequence tracker and callout arrows.
- `06-empirical-validation.png` — Verified animated progress bars (`8.0% vs 27.22% baseline`, `100% vs 83.04% baseline`, `100% vs 88% baseline`) and right-hand Scope Boundaries disclosure box.
- `07-closing-summary.png` — Verified clean summary layout and zero text overlap.
