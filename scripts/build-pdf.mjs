// Builds proposal/TTC-Proposal-Forge-Growth.pdf from the proposal page's print layout.
// Usage: node scripts/dev-server.mjs  (in another terminal), then: npm run pdf
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = createRequire("/opt/node22/lib/node_modules/")("playwright"); }

const BASE = process.env.BASE_URL || "http://localhost:4173";
const out = fileURLToPath(new URL("../proposal/TTC-Proposal-Forge-Growth.pdf", import.meta.url));

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelectorAll(".faq details").forEach((d) => (d.open = true)));
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: out, format: "A4", printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-size:8px;color:#8a93a6;padding:0 13mm;display:flex;justify-content:space-between;font-family:Arial,sans-serif">
    <span>TTC Delivery Platform · Proposal by Forge Growth · Confidential</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
});
await browser.close();
console.log("PDF written:", out);
