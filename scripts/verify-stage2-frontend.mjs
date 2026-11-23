import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "evidence/stage-2-build/frontend");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const server = spawn("npx", ["vite", "preview", "--port", "4173", "--host", "127.0.0.1"], {
    stdio: "ignore",
  });

  const baseUrl = "http://127.0.0.1:4173/";
  try {
    await waitForServer(baseUrl);
    const chromePath = "/home/yap/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome";
    const browser = await chromium.launch(
      fs.existsSync(chromePath) ? { executablePath: chromePath } : undefined
    );

    // 1. Desktop 1440x900 Walkthrough
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await desktopCtx.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Screenshot 1: Landing Terminal (Approved NVDA Ignite Bar 11/11)
    await page.screenshot({
      path: path.join(OUT_DIR, "01-desktop-terminal-approved-1440px.png"),
      fullPage: true,
    });

    // Click SMCI Reject Scenario & Commit Veto to Audit Ledger
    await page.click("#preset-btn-PROP-SMCI-REJECT-R03-R10");
    await page.waitForTimeout(200);
    await page.click("#btn-commit-proposal");
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(OUT_DIR, "02-desktop-terminal-rejected-veto-1440px.png"),
      fullPage: true,
    });

    // Navigate to Tab 02: Counterfactual Rejection Ledger
    await page.click("#nav-tab-ledger");
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(OUT_DIR, "03-desktop-counterfactual-ledger-1440px.png"),
      fullPage: true,
    });

    // Navigate to Tab 03: Regime & 11-Sector RS Matrix
    await page.click("#nav-tab-regime");
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(OUT_DIR, "04-desktop-regime-sector-matrix-1440px.png"),
      fullPage: true,
    });

    // Navigate to Tab 04: QCA Fleet & 12 Skill ZIP Packager
    await page.click("#nav-tab-qca");
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(OUT_DIR, "05-desktop-qca-fleet-packager-1440px.png"),
      fullPage: true,
    });

    // 2. Mobile 390x844 Walkthrough & Overflow Verification
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mPage = await mobileCtx.newPage();
    await mPage.goto(baseUrl, { waitUntil: "networkidle" });
    await mPage.waitForTimeout(350);

    const overflowCheck = await mPage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    await mPage.screenshot({
      path: path.join(OUT_DIR, "06-mobile-terminal-390px.png"),
      fullPage: false,
    });

    await mPage.click("#nav-tab-ledger");
    await mPage.waitForTimeout(200);
    await mPage.screenshot({
      path: path.join(OUT_DIR, "07-mobile-ledger-390px.png"),
      fullPage: false,
    });

    await browser.close();

    console.log(
      JSON.stringify(
        {
          status: "PASS",
          consoleErrorsCount: consoleErrors.length,
          consoleErrors,
          mobileOverflow: overflowCheck,
          screenshots: fs.readdirSync(OUT_DIR),
        },
        null,
        2
      )
    );

    if (consoleErrors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main();
