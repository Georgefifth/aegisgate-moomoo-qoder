// Stage 3 Real-Browser QA Runner (Firefox / Chromium)
// Tests both the deployed production site (https://moomoo-x-qoder.vercel.app) and local build.

import { chromium, firefox } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "https://moomoo-x-qoder.vercel.app";
const OUT = process.env.QA_OUT ?? "evidence/stage-3-qa";
const BROWSER = process.env.BROWSER === "chromium" ? "chromium" : "firefox";
const HEADED = process.env.HEADED === "1";

const SHOTS = path.join(OUT, "screens");
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectVisible(page, selector, timeout = 10000) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

async function expectText(page, text, timeout = 10000) {
  const locator = page.getByText(text).first();
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

const scenarios = [
  {
    id: "P0-01-landing",
    title: "Landing terminal, Swiss Brutalist hierarchy, R01-R11 matrix & zero horizontal overflow",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await ctx.expectVisible("h1.masthead-title");
      ctx.assert(
        (await page.title()).includes("AEGISGATE"),
        "Page title does not include AEGISGATE"
      );

      // Verify all 11 rule cells + 1 MATH proof cell = 12 cells in R01-R11 matrix
      const cellCount = await page.locator(".r11-cell").count();
      ctx.assert(cellCount === 12, `Expected 12 annunciator cells, got ${cellCount}`);

      // Verify zero horizontal overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      ctx.assert(overflow <= 1, `Horizontal overflow detected: ${overflow}px`);

      await ctx.shot("landing");
    },
  },
  {
    id: "P0-02-approve-persist",
    title: "End-to-end approved proposal execution (US.PLTR) & persistence across page reload",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#preset-btn-PROP-PLTR-002");
      await ctx.expectText(/GATE PASS \(11\/11\) — US\.PLTR AUTHORIZED/);

      await page.click("#btn-commit-proposal");
      await ctx.expectText(/COMMITTED DEC-20261123-009: US\.PLTR passed 11\/11 rules/);
      await ctx.shot("pltr-committed");

      // Reload browser (F5) and verify state survived reload
      await page.reload({ waitUntil: "networkidle" });
      await page.click("#nav-tab-ledger");
      await ctx.expectText("DEC-20261123-009");
      await ctx.expectText("MM-SIM-904108");
      await ctx.shot("pltr-persisted-after-reload");
    },
  },
  {
    id: "P0-03-veto-counterfactual",
    title: "Deterministic gate veto (US.SMCI pre-earnings & >36% cap) and counterfactual saved loss",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#preset-btn-PROP-SMCI-REJECT-R03-R10");
      await ctx.expectText(/GATE VETO \(7\/11\) — BLOCKED BY R03, R05, R06, R10/);

      await page.click("#btn-commit-proposal");
      await ctx.expectText(/VETO LOGGED .* US\.SMCI blocked by \[R03, R05, R06, R10\]/);
      await ctx.expectText(/\+\$18,619\.45/); // Saved drawdown KPI incremented from $12,270.90 to $18,619.45
      await ctx.shot("smci-veto-logged");
    },
  },
  {
    id: "P0-04-session-holiday-guard",
    title: "What-If 42% concentration stress test & Thanksgiving / Black Friday holiday cutoff guard (R11)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#btn-stress-violation");
      await ctx.expectText(/MARKET ORDERS BLOCKED IN EXTENDED HOURS/);

      await page.selectOption("#select-sgt-session", "BLACK_FRIDAY_FLATTEN_CUTOFF");
      await ctx.expectText(/HOLIDAY CUTOFF \/ FLATTEN ACTIVE/);
      await ctx.shot("holiday-flatten-guard");
    },
  },
  {
    id: "P1-05-invalid-input-recovery",
    title: "Invalid input validation (Stop >= Entry, malformed symbol) and clean recovery",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.fill("#input-symbol", "INVALID_SYMBOL");
      await page.fill("#input-stop-price", "160.0"); // Above entry 142.5 on a BUY
      await ctx.expectText(/Use Moomoo MARKET\.CODE format/);
      await ctx.expectText(/must be strictly below Entry/);

      await page.click("#btn-commit-proposal");
      await ctx.expectText(/Cannot commit proposal: fix invalid input field/);
      await ctx.shot("invalid-input-blocked");

      // Recover by fixing inputs
      await page.fill("#input-symbol", "US.NVDA");
      await page.fill("#input-stop-price", "138.8");
      await page.click("#btn-commit-proposal");
      await ctx.expectText(/COMMITTED .*: US\.NVDA passed 11\/11 rules/);
      await ctx.shot("invalid-input-recovered");
    },
  },
  {
    id: "P1-06-ledger-empty-and-jsonl",
    title: "Counterfactual ledger filters, actionable empty state, and JSONL artifact inspector",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#nav-tab-ledger");
      await ctx.expectText(/02 \/\/ FIRST-CLASS DECISION & COUNTERFACTUAL REJECTION LEDGER/);

      // Filter by R09 Option 0DTE trap
      await page.getByRole("button", { name: /R09 OPTION 0DTE TRAP/i }).click();
      await ctx.expectText("DEC-20261122-006");
      await ctx.expectText("+$2,808 LOSS SAVED");

      // Trigger empty state via search
      await page.fill("#ledger-search-input", "NON_EXISTENT_TICKER_XYZ");
      await ctx.expectText("NO AUDIT RECORDS MATCH CURRENT FILTER");
      await ctx.shot("ledger-empty-state");

      // Recover via Reset button
      await page.getByRole("button", { name: /RESET LEDGER FILTERS/i }).click();
      await ctx.expectText("DEC-20261117-001");
      await ctx.shot("ledger-restored");
    },
  },
  {
    id: "P1-07-regime-and-11-sectors",
    title: "Market regime simulator (CASH wedge drop), 11-Sector RS & AA Playbook §08 Reconciler",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#nav-tab-regime");
      await ctx.expectText("US.XLK — Technology Select Sector SPDR");
      await ctx.expectText("REC-08");

      await page.getByRole("button", { name: /LOAD CASH \(WEDGE DROP\)/i }).click();
      await ctx.expectText("DIAGNOSED POSTURE: CASH");
      await page.click("#btn-apply-regime");
      await ctx.expectText(/Synced Market Regime Posture \[CASH\] to Portfolio Guard/);
      await ctx.shot("regime-cash-applied");

      // Return to Terminal and verify R07 blocks new entries under CASH regime
      await page.click("#nav-tab-terminal");
      await ctx.expectText(/KILL-SWITCH TRIPPED \(CASH/);
      await ctx.shot("terminal-blocked-by-cash-regime");
    },
  },
  {
    id: "P1-08-qca-fleet-and-zips",
    title: "QCA 4-Thread roster, Forward Mode schedules & 12 downloadable Skill .zip packages",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click("#nav-tab-qca");
      await ctx.expectText("aegis-coordinator");
      await ctx.expectText("aegis-risk-auditor");
      await ctx.expectText("aegisgate-r1-r11-risk-auditor");

      const skillZipLinks = await page.locator('a[download$=".zip"]').count();
      ctx.assert(
        skillZipLinks === 12,
        `Expected 12 downloadable QCA skill .zip links, found ${skillZipLinks}`
      );

      // Verify actual binary .zip asset is served with 200 OK
      const zipCheck = await page.evaluate(async () => {
        const res = await fetch("./qca-skills/aegisgate-r1-r11-risk-auditor.zip");
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        return {
          status: res.status,
          byteLength: bytes.byteLength,
          isPkZipHeader: bytes[0] === 0x50 && bytes[1] === 0x4b,
        };
      });
      ctx.assert(
        zipCheck.status === 200 && zipCheck.isPkZipHeader && zipCheck.byteLength > 1000,
        `Invalid QCA skill zip response: ${JSON.stringify(zipCheck)}`
      );

      await ctx.shot("qca-fleet-and-12-zips");
    },
  },
  {
    id: "P2-09-keyboard-a11y",
    title: "Keyboard navigation, explicit form labels & >=44px primary touch targets",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.focus("#input-symbol");
      await page.keyboard.press("Tab");
      const activeId = await page.evaluate(() => document.activeElement?.id || "");
      ctx.assert(
        activeId === "select-order-type",
        `Expected Tab from #input-symbol to focus #select-order-type, got '${activeId}'`
      );

      const primaryBtnBox = await page.locator("#btn-commit-proposal").boundingBox();
      ctx.assert(
        primaryBtnBox && primaryBtnBox.height >= 44,
        `Primary button height (${primaryBtnBox?.height}px) is below 44px touch target minimum`
      );
      await ctx.shot("keyboard-focus-a11y");
    },
  },
];

function collectIssues(page) {
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push({ kind: "console", text: msg.text() });
  });
  page.on("pageerror", (err) => {
    issues.push({ kind: "pageerror", text: err.message });
  });
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "request failed";
    if (!reason.includes("ERR_ABORTED") && !reason.includes("NS_BINDING_ABORTED")) {
      issues.push({ kind: "requestfailed", text: `${reason} ${req.url()}` });
    }
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500) issues.push({ kind: "http", text: `${status} ${res.url()}` });
    else if (status >= 400) {
      issues.push({ kind: "http", level: "warn", text: `${status} ${res.url()}` });
    }
  });
  return issues;
}

async function main() {
  const firefoxPath = "/home/yap/.cache/ms-playwright/firefox-1572/firefox/firefox";
  const chromiumPath = "/home/yap/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome";

  const browserType = BROWSER === "chromium" ? chromium : firefox;
  const execPath =
    BROWSER === "chromium"
      ? fs.existsSync(chromiumPath)
        ? chromiumPath
        : undefined
      : fs.existsSync(firefoxPath)
      ? firefoxPath
      : undefined;

  const browser = await browserType.launch({
    headless: !HEADED,
    ...(execPath ? { executablePath: execPath } : {}),
  });

  const startedAt = new Date().toISOString();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: vp.viewport,
      deviceScaleFactor: vp.deviceScaleFactor,
    });

    for (const scenario of scenarios) {
      const page = await context.newPage();
      const issues = collectIssues(page);
      const screenshots = [];
      const started = Date.now();
      let status = "pass";
      let error = null;

      const ctx = {
        assert,
        expectVisible: (selector, timeout) => expectVisible(page, selector, timeout),
        expectText: (text, timeout) => expectText(page, text, timeout),
        shot: async (name, opts = {}) => {
          const file = path.join(SHOTS, `${scenario.id}-${name}-${vp.name}.png`);
          await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
          screenshots.push(file);
          return file;
        },
      };

      try {
        await scenario.run(page, ctx);
      } catch (err) {
        status = "fail";
        error = err.message;
      } finally {
        await page.close().catch(() => {});
      }

      const errors = issues.filter((i) => (i.level ?? "error") === "error");
      const warnings = issues.filter((i) => i.level === "warn");
      if (status === "pass" && errors.length > 0) {
        status = "fail";
        error = errors.map((i) => `${i.kind}: ${i.text}`).join(" | ");
      }

      results.push({
        viewport: vp.name,
        id: scenario.id,
        title: scenario.title,
        status,
        ms: Date.now() - started,
        error,
        errors,
        warnings,
        screenshots,
      });

      console.log(
        `${status === "pass" ? "✓" : "✗"} [${vp.name}] ${scenario.id}` +
          (error ? ` — ${error}` : "")
      );
    }

    await context.close();
  }

  await browser.close();

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
  };
  const finishedAt = new Date().toISOString();
  const report = {
    base: BASE,
    browser: BROWSER,
    headed: HEADED,
    startedAt,
    finishedAt,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(report, null, 2));

  console.log(`\n${summary.pass}/${summary.total} passed on ${BASE} (${BROWSER}) — see ${OUT}/`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
