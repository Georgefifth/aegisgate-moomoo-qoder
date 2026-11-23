# Stage 3 — Real-Browser QA & User Experience Verification Report

**Product:** AegisGate — Deterministic `R01–R11` Multi-Agent Trading, Risk Auditing & Counterfactual Control Plane (2026 Moomoo × Qoder AI Trading Agent Challenge)  
**Deployed Production URL Tested:** `https://moomoo-x-qoder.vercel.app/`  
**Local Build URL Tested:** `http://127.0.0.1:4173/`  
**Browser Engine:** Playwright Headless Firefox (`firefox-1572`)  
**Viewports Tested:** Desktop (`1440×900`, `deviceScaleFactor: 1`) & Mobile (`390×844`, `deviceScaleFactor: 2`)  
**Date:** `2026-11-23`  

---

## 1. Executive Summary & Pass/Fail Statistics

| Target Environment | Browser | Total Scenarios (Desktop + Mobile) | Passed | Failed | Blocked | Console / Page / 5xx Errors |
|---|---|---|---|---|---|---|
| **Deployed Production (`https://moomoo-x-qoder.vercel.app`)** | Firefox Headless | **18** (9 Desktop + 9 Mobile) | **18** | **0** | **0** | **0** |
| **Local Production Preview (`http://127.0.0.1:4173`)** | Firefox Headless | **18** (9 Desktop + 9 Mobile) | **18** | **0** | **0** | **0** |
| **Combined Total** | Firefox Headless | **36** | **36 (100%)** | **0** | **0** | **0** |

Raw machine-readable results are stored in:
- `evidence/stage-3-qa/results.json` (and `evidence/stage-3-qa/results-deployed.json`)
- `evidence/stage-3-qa/results-local.json`
- `qa/scenarios.md` & `qa/run.mjs`

---

## 2. Executed End-to-End Scenarios (`qa/run.mjs`)

| Scenario ID | Priority | Viewport | Deployed (`ms`) | Local (`ms`) | Status | Verified Business Outcome & Assertions |
|---|---|---|---|---|---|---|
| `P0-01-landing` | **P0** | Desktop / Mobile | 1412 / 948 | 492 / 418 | **PASS** | `h1.masthead-title` visible; all 12 annunciator cells (`R01–R11` + `MATH` proof) rendered; `scrollWidth - innerWidth <= 1` (`0px` overflow on both 1440px and 390px). |
| `P0-02-approve-persist` | **P0** | Desktop / Mobile | 1690 / 1510 | 914 / 862 | **PASS** | Selected `US.PLTR` Wedge Pop (`11/11 PASS`) $\rightarrow$ clicked `#btn-commit-proposal` $\rightarrow$ verified `COMMITTED DEC-20261123-009` & order ID `MM-SIM-904108` $\rightarrow$ reloaded browser (`F5`) $\rightarrow$ opened Tab `02` Ledger $\rightarrow$ confirmed `DEC-20261123-009` persisted across reload. |
| `P0-03-veto-counterfactual` | **P0** | Desktop / Mobile | 1185 / 1094 | 612 / 588 | **PASS** | Selected `US.SMCI` (`#preset-btn-PROP-SMCI-REJECT-R03-R10`) $\rightarrow$ verified `GATE VETO (7/11) — BLOCKED BY R03, R05, R06, R10` $\rightarrow$ committed rejection $\rightarrow$ verified Counterfactual Drawdown Saved KPI incremented from `+$12,270.90` to `+$18,619.45`. |
| `P0-04-session-holiday-guard` | **P0** | Desktop / Mobile | 1120 / 1042 | 560 / 534 | **PASS** | Clicked `#btn-stress-violation` (`SIMULATE 42% + PRE-MKT BREACH`) $\rightarrow$ verified `MARKET ORDERS BLOCKED IN EXTENDED HOURS` (`R11`) and `41.87% > 36%` (`R03`) $\rightarrow$ switched session to `BLACK_FRIDAY_FLATTEN_CUTOFF` $\rightarrow$ verified `HOLIDAY CUTOFF / FLATTEN ACTIVE`. |
| `P1-05-invalid-input-recovery` | **P1** | Desktop / Mobile | 1340 / 1280 | 695 / 670 | **PASS** | Entered invalid symbol `"INVALID_SYMBOL"` and invalid stop `"160.0"` above entry `"142.5"` on a `BUY` $\rightarrow$ verified field error messages and `[ERROR] Cannot commit proposal` banner $\rightarrow$ corrected inputs back to `"US.NVDA"` and `"138.8"` $\rightarrow$ committed successfully. |
| `P1-06-ledger-empty-and-jsonl` | **P1** | Desktop / Mobile | 1290 / 1210 | 640 / 618 | **PASS** | Opened Tab `02` $\rightarrow$ filtered by `R09 OPTION 0DTE TRAP` (`DEC-20261122-006`, `+$2,808 LOSS SAVED`) $\rightarrow$ searched `"NON_EXISTENT_TICKER_XYZ"` $\rightarrow$ verified actionable empty state (`NO AUDIT RECORDS MATCH CURRENT FILTER`) $\rightarrow$ clicked `RESET LEDGER FILTERS` $\rightarrow$ verified full ledger restored. |
| `P1-07-regime-and-11-sectors` | **P1** | Desktop / Mobile | 1380 / 1295 | 710 / 685 | **PASS** | Opened Tab `03` $\rightarrow$ verified 11 SPDR sectors (`US.XLK` #11 down to `US.XLV` #1) and 8 reconciled AA Playbook §08 rows (`REC-01`–`REC-08`) $\rightarrow$ clicked `LOAD CASH (WEDGE DROP)` $\rightarrow$ clicked `#btn-apply-regime` $\rightarrow$ returned to Tab `01` and verified `R07` blocks new long entries under `CASH` regime (`KILL-SWITCH TRIPPED`). |
| `P1-08-qca-fleet-and-zips` | **P1** | Desktop / Mobile | 1260 / 1190 | 635 / 610 | **PASS** | Opened Tab `04` $\rightarrow$ verified 5 QCA agent templates, 3 Forward Mode schedules, and 12 `.zip` skill download rows $\rightarrow$ fetched `./qca-skills/aegisgate-r1-r11-risk-auditor.zip` in-browser and verified HTTP `200`, `PK` (`0x50 0x4b`) ZIP header, and size `> 1 KB`. |
| `P2-09-keyboard-a11y` | **P2** | Desktop / Mobile | 980 / 920 | 440 / 420 | **PASS** | Focused `#input-symbol` $\rightarrow$ pressed `Tab` $\rightarrow$ verified focus moved deterministically to `#select-order-type` $\rightarrow$ verified `#btn-commit-proposal` touch target height $\ge 44\text{px}$. |

---

## 3. Issues Discovered & Fixed During Stage 3 QA (Regression Log)

During our first Firefox QA pass and visual inspection of `evidence/stage-3-qa/screens/`, we discovered and fixed **3 real visual/layout defects** before running the final regression pass:

| Issue ID | Severity | Symptom & Screenshot Before Fix | Root Cause | Code Fix Applied | Regression Verification |
|---|---|---|---|---|---|
| **QA-01** | **P0 (Mobile 390px Layout)** | On `390×844` mobile in Firefox (`P0-04-session-holiday-guard-holiday-flatten-guard-mobile.png`), the left column stretched wider than `390px` when `#select-sgt-session` displayed long option text, clipping the left border. | In Firefox CSS Grid, `.terminal-col`, `.panel-body`, `.field-group`, and `.brutalist-select` defaulted to `min-width: auto`, allowing long `<select>` option strings to expand the grid column beyond `100vw`. | Added `min-width: 0; max-width: 100%; width: 100%` to `.terminal-col`, `.panel-body`, `.field-group`, `.brutalist-input`, and `.brutalist-select` in `src/index.css`. | Re-ran `qa/run.mjs` on mobile (`390×844`) and visually verified `P0-04-session-holiday-guard-holiday-flatten-guard-mobile.png` — zero clipping, `0px` horizontal overflow. |
| **QA-02** | **P1 (Mobile 390px Regime Box)** | On `390×844` mobile in Tab `03` (`P1-07-regime-and-11-sectors-regime-cash-applied-mobile.png`), the `INTERACTIVE QQQ / 20-EMA REGIME SIMULATOR` remained in a cramped 2-column side-by-side split (`1fr 1.3fr`). | `src/App.tsx` used an inline `gridTemplateColumns: "1fr 1.3fr"` style that could not collapse in the `@media (max-width: 820px)` query. | Replaced the inline grid style with `.regime-simulator-grid` in `src/index.css` and collapsed it to `grid-template-columns: 1fr` at `max-width: 820px`. | Visually verified in re-captured `P1-07-regime-and-11-sectors-regime-cash-applied-mobile.png` — clean vertical stack on 390px mobile. |
| **QA-03** | **P1 (Desktop Tab Contrast)** | Immediately after clicking a top mode tab (`#nav-tab-terminal` / `#nav-tab-ledger`), screenshots captured within 50ms showed a washed-out gray tab background with light text. | `.mode-tab-btn` had `transition: background-color 100ms ease` while `color` snapped immediately (`0ms`), causing a low-contrast mid-transition state. | Removed `background-color` transition on `.mode-tab-btn` and added `.mode-tab-btn.active:hover { background: var(--ink); color: var(--bg-paper); }` in `src/index.css`. | Visually verified in `P1-07-regime-and-11-sectors-terminal-blocked-by-cash-regime-desktop.png` and `P0-02-approve-persist-pltr-persisted-after-reload-desktop.png` — instant high-contrast `#0C0C0C` active tab state. |

---

## 4. First-Time User Experience (UX) Review

Walking through the product without developer documentation:

1. **5-Second Purpose Comprehension:** The top exchange ribbon (`AEGISGATE // MOOMOO × QODER CHALLENGE · ACCOUNT: SIM-COMP-5770313 ($100K PAPER US)`) and masthead (`AEGISGATE Risk & Execution CONTROL PLANE` + 4 live KPIs: Guarded Paper NAV `$104,820.00`, Counterfactual Drawdown Saved `+$12,270.90`, Portfolio Heat `2.15% / 6.00%`, Order Quota `14 / 200`) immediately communicate what the system does and why it exists.
2. **Zero-Guesswork Primary Flow:** On the default landing view (`01. GATE & EXECUTION TERMINAL`), the left column offers 6 one-click Moomoo anomaly scenarios (3 passing, 3 rule-violating traps), the center column shows the 11-cell `R01–R11` annunciator matrix and primary action button (`COMMIT & QUEUE 212 SHARES LADDER` or `LOG REJECTION & TRACK SAVED LOSS`), and the right column displays the live Guarded-vs-Ungated Counterfactual Equity Canvas.
3. **Actionable Error Recovery:** Entering an invalid symbol or placing a stop price on the wrong side of the entry price immediately highlights the exact input box in signal orange (`#FF3300`) with a mathematical explanation (`Stop ($160.00) must be strictly below Entry ($142.50) for a BUY`).
4. **Anti-Slop Visual Distinctiveness Check:** Could this screen be dropped into a generic CRM/SaaS app? **No** — the `01 // Swiss Brutalism` archival newsprint (`#F2EFE9`) + carbon ink (`#0C0C0C`) grid, the `R01–R11` Moomoo competition guardrail annunciator, the 3-rung limit-order ladder ticket, and the counterfactual oscilloscope canvas are unmistakably tailored to algorithmic trading & risk governance.

---

## 5. Screenshot Evidence Inventory (`evidence/stage-3-qa/screens/`)

- `P0-01-landing-landing-desktop.png` & `P0-01-landing-landing-mobile.png`
- `P0-02-approve-persist-pltr-committed-desktop.png` & `P0-02-approve-persist-pltr-persisted-after-reload-desktop.png` (+ mobile counterparts)
- `P0-03-veto-counterfactual-smci-veto-logged-desktop.png` & `P0-03-veto-counterfactual-smci-veto-logged-mobile.png`
- `P0-04-session-holiday-guard-holiday-flatten-guard-desktop.png` & `P0-04-session-holiday-guard-holiday-flatten-guard-mobile.png`
- `P1-05-invalid-input-recovery-invalid-input-blocked-desktop.png` & `P1-05-invalid-input-recovery-invalid-input-recovered-desktop.png` (+ mobile counterparts)
- `P1-06-ledger-empty-and-jsonl-ledger-empty-state-desktop.png` & `P1-06-ledger-empty-and-jsonl-ledger-restored-desktop.png` (+ mobile counterparts)
- `P1-07-regime-and-11-sectors-regime-cash-applied-desktop.png` & `P1-07-regime-and-11-sectors-terminal-blocked-by-cash-regime-desktop.png` (+ mobile counterparts)
- `P1-08-qca-fleet-and-zips-qca-fleet-and-12-zips-desktop.png` & `P1-08-qca-fleet-and-zips-qca-fleet-and-12-zips-mobile.png`
- `P2-09-keyboard-a11y-keyboard-focus-a11y-desktop.png` & `P2-09-keyboard-a11y-keyboard-focus-a11y-mobile.png`
