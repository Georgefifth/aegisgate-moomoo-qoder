# Stage 5 — Submission Package & Final Verification Evidence

**Project:** AegisGate — Deterministic `R01–R11` Multi-Agent Trading, Risk Auditing & Counterfactual Control Plane (2026 Moomoo × Qoder AI Trading Agent Challenge)  
**Submission Package Directory:** `submission/`  

---

## 1. Deliverables Inventory & Verification

| File / Asset | Path | Format & Dimensions | Size | Verification Status |
|---|---|---|---|---|
| **Copy-Paste Submission Fields** | `submission/fields.md` | GitHub-Flavored Markdown | `11.2 KB` | **PASS** (Single final version per field; grounded in Stage 3.5 metrics) |
| **Human Setup & Submission Checklist** | `submission/checklist.md` | GitHub-Flavored Markdown | `4.1 KB` | **PASS** (Self-contained 3-minute QCA setup + survey submission steps) |
| **Project Thumbnail (Generated)** | `submission/assets/thumbnail.png` | PNG, `1200×800` (`3:2` ratio) | `132 KB` (`< 5 MB`) | **PASS** (Bespoke generated graphic, visually verified via `read`) |
| **Gallery Image 01 (Approved Terminal)** | `submission/assets/gallery-01-terminal-approved.png` | PNG, `1200×800` (`3:2` ratio) | `292 KB` (`< 5 MB`) | **PASS** (Caption: 116 chars `<= 150`) |
| **Gallery Image 02 (Rejected SMCI Veto)** | `submission/assets/gallery-02-terminal-veto.png` | PNG, `1200×800` (`3:2` ratio) | `289 KB` (`< 5 MB`) | **PASS** (Caption: 127 chars `<= 150`) |
| **Gallery Image 03 (Counterfactual Ledger)** | `submission/assets/gallery-03-counterfactual-ledger.png` | PNG, `1200×800` (`3:2` ratio) | `178 KB` (`< 5 MB`) | **PASS** (Caption: 123 chars `<= 150`) |
| **Gallery Image 04 (Regime & 11-Sector RS)** | `submission/assets/gallery-04-regime-11sectors.png` | PNG, `1200×800` (`3:2` ratio) | `177 KB` (`< 5 MB`) | **PASS** (Caption: 118 chars `<= 150`) |
| **Gallery Image 05 (QCA Fleet & 12 ZIPs)** | `submission/assets/gallery-05-qca-fleet-12zips.png` | PNG, `1200×800` (`3:2` ratio) | `102 KB` (`< 5 MB`) | **PASS** (Caption: 120 chars `<= 150`) |
| **Gallery Image 06 (Empirical Validation)** | `submission/assets/gallery-06-empirical-validation.png` | PNG, `1200×800` (`3:2` ratio) | `321 KB` (`< 5 MB`) | **PASS** (Caption: 128 chars `<= 150`) |
| **1080p30 Technical Demo Video** | `submission/assets/demo.mp4` | MP4 (`H.264 + AAC`, `1920×1080`, `30 fps`, `73.3s`) | `11.45 MB` | **PASS** (7 keyframes inspected in `evidence/stage-4-demo/frames/`) |
| **Interactive 10-Slide Presentation Deck** | `submission/assets/deck.html` | Self-contained HTML/CSS/SVG Deck | `35 KB` | **PASS** (Deployed at `https://moomoo-x-qoder.vercel.app/deck.html`) |
| **Structured Decision & Rejection Log** | `submission/assets/decisions.jsonl` | JSON Lines (`8` seeded + live records) | `4.9 KB` | **PASS** (Includes approved fills, rejected rules, and counterfactual saved USD) |
| **12 Validated QCA Skill `.zip` Packages** | `submission/assets/qca-skills/*.zip` | 12 ZIP Archives + `manifest.json` | `196 KB` total | **PASS** (`12/12` validated against QCA skill schema) |

---

## 2. Public Link Accessibility Verification

All public URLs included in `submission/fields.md` were tested and verified to return HTTP `200 OK`:
1. **Live Control Plane (Vercel):** `https://moomoo-x-qoder.vercel.app/` $\rightarrow$ `HTTP/2 200`
2. **Live 10-Slide Presentation Deck (Vercel):** `https://moomoo-x-qoder.vercel.app/deck.html` $\rightarrow$ `HTTP/2 200`
3. **Backup Control Plane (GitHub Pages):** `https://georgefifth.github.io/aegisgate-moomoo-qoder/` $\rightarrow$ `HTTP/2 200`
4. **Public GitHub Repository:** `https://github.com/Georgefifth/aegisgate-moomoo-qoder` $\rightarrow$ `HTTP/2 200`

---

## 3. Fact & Metric Traceability Matrix

Every numerical claim in `submission/fields.md` and `deck.html` traces directly to verified Stage 3 and Stage 3.5 artifacts:
- **`-7.97%` vs. `-27.22%` Max Drawdown (3.4× lower) & `275` blocked high-risk entries:** Verified in `evidence/stage-3.5-validation/final-results.json` (`VAL-ADV-BACKTEST-VS-UNGATED`, 190 real out-of-sample trading days across `NVDA`, `PLTR`, `META`, `AVGO`, `SMCI`, `TSLA`).
- **`29.22` max RSI point divergence & `235` prevented 30/70 signal flips:** Verified in `evidence/stage-3.5-validation/final-results.json` (`VAL-INT-CUTLER-BUG-BENCHMARK`, `1,386` real daily equity bars).
- **`0.0066 ms` per `R01–R11` evaluation (`6.58 ms` for 1,000 evaluations):** Verified in `evidence/stage-3.5-validation/final-results.json` (`VAL-ADV-BATCH-THROUGHPUT`).
- **`36/36` Playwright Firefox QA scenarios passed (`18` deployed + `18` local across `1440×900` and `390×844`):** Verified in `evidence/stage-3-qa/report.md` and `evidence/stage-3-qa/results.json`.
- **`12/12` QCA Skill `.zip` packages validated:** Verified in `public/qca-skills/manifest.json`.
