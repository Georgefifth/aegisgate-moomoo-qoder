# Human Operation & Submission Checklist — AegisGate (Moomoo × Qoder Challenge)

> Follow these steps to (A) wire the packaged AegisGate agents & skills into your personal Qoder Cloud Agents (`qca`) / Moomoo competition account in ~3 minutes, and (B) submit your entry on the official challenge form.

---

## Part A: 3-Minute Qoder Cloud Agents (`qca`) & Moomoo Setup

### Step 1 — Connect Moomoo MCP in QCA Vault (Browser OAuth)
1. Open [https://qoder.com/cloud-agents](https://qoder.com/cloud-agents) and select **Forward Mode** in the left sidebar.
2. Click **Vault → Create** and name it `moomoo-mcp`.
3. Click **Add**, set Credential Type to **MCP OAuth**, enter `https://mcp.moomoo.com/mcp` as the MCP Server URL, leave Access Token and OAuth client credentials empty, and click **Connect**.
4. In the Moomoo OAuth window, sign in with your **Moomoo ID**, keep **Market Data** and **Watchlists** checked (do **not** select live trading execution), tick the license box, and click **Confirm**.

### Step 2 — Upload the 12 Pre-Packaged Skill `.zip` Files
1. In the QCA console sidebar, open **Skills → Create Skill**.
2. Upload each `.zip` file from `submission/assets/qca-skills/` (one upload per skill — all 12 archives have already been validated for single top-level folder structure, `SKILL.md` frontmatter, and repaired relative links):
   - `aegisgate-r1-r11-risk-auditor.zip` *(Custom AegisGate deterministic `R01–R11` gate & 3-rung ladder skill)*
   - `moomoo-quote.zip`
   - `moomoo-sim-trading.zip`
   - `moomoo-news-search.zip`
   - `moomoo-stock-digest.zip`
   - `moomoo-comment-sentiment.zip`
   - `moomoo-unusual-technical-signal-alerts.zip`
   - `moomoo-unusual-capital-flows.zip`
   - `moomoo-unusual-derivatives-activity.zip`
   - `moomoo-grid-strategy.zip`
   - `moomoo-trading.zip`
   - `moomoo-crypto.zip`

### Step 3 — Configure the 4-Thread QCA Templates & Schedules
1. Open `https://moomoo-x-qoder.vercel.app/` and click tab **`04. QCA FLEET & SKILL PACKAGER`**.
2. Copy the system prompts for `aegis-scout`, `aegis-risk-auditor`, `aegis-executor`, and `aegis-coordinator` (or run the one-command `curl` script at the bottom of Tab 04 with your local `export QODER_PAT=...` environment variable).
3. In your Forward Mode conversation (or via API), paste the **3 Forward Mode Schedule Prompts** from Tab 04:
   - `AegisGate Pre-Market Anomaly & Regime Scan` (`30 8 * * 1-5`, `America/New_York`)
   - `AegisGate Intraday 15m Stop Watchdog & Ladder Executor` (`*/15 9-15 * * 1-5`, `America/New_York`)
   - `AegisGate Black Friday Early-Close Flatten Guard` (`2026-11-27T12:40:00-05:00`, `America/New_York`)

---

## Part B: Official Challenge Form Submission

**Official Submission Link (from Luma):**  
[https://survey.alibabacloud.com/uone/sg/survey/nXEUDcuj-?langkey=en&utm_source=luma](https://survey.alibabacloud.com/uone/sg/survey/nXEUDcuj-?langkey=en&utm_source=luma)  
**Deadline:** `30 November 2026, 23:59 SGT`

### Pre-Submit Verification Checklist

- [x] **Project Name & Elevator Pitch:** Ready in `submission/fields.md` (§1 & §2).
- [x] **Live Presentation Deck Link:** `https://moomoo-x-qoder.vercel.app/deck.html` (and local file `submission/assets/deck.html`).
- [x] **Live Control Plane Dashboard Link:** `https://moomoo-x-qoder.vercel.app/` (Backup: `https://georgefifth.github.io/aegisgate-moomoo-qoder/`).
- [x] **Runnable Trading-Agent GitHub Repository:** `https://github.com/Georgefifth/aegisgate-moomoo-qoder` (Public, `0` secrets committed).
- [x] **Strategy Explanation & Risk Limits (`R01–R11`):** Documented in `submission/fields.md` (§4), `AGENTS.md`, and Slides 04–06 of `deck.html`.
- [x] **Log of Trading Decisions, Fills & Counterfactual Rejections:** Included in `logs/decisions.jsonl`, `submission/assets/decisions.jsonl`, Tab 02 of the live dashboard, and Slide 07 of `deck.html`.
- [x] **Demo Showing What Worked, What Failed & Why:** Rendered in `submission/assets/demo.mp4` (`1920×1080`, `30 fps`, `73.3s`) and Slide 09 of `deck.html`.
- [x] **Thumbnail & 6 Gallery Images:** Generated at `1200×800` (`3:2` ratio, PNG, `< 350 KB` each) in `submission/assets/`.
- [ ] **`TODO(human)` Final Submit:** Open the submission survey link above, paste the fields from `submission/fields.md`, attach/link `submission/assets/demo.mp4` and `https://moomoo-x-qoder.vercel.app/deck.html`, enter your registered Luma email & Moomoo SG ID, and click **Submit**.
