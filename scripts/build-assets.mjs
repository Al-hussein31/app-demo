// Regenerates screenshots, QR code and social image from the running preview.
// Usage: node scripts/dev-server.mjs  (in another terminal), then: node scripts/build-assets.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = createRequire("/opt/node22/lib/node_modules/")("playwright"); }

const BASE = process.env.BASE_URL || "http://localhost:4173";
const SITE = process.env.SITE_URL || "https://ttc.forgegrowth.ng";
const img = fileURLToPath(new URL("../assets/img/", import.meta.url));

await QRCode.toFile(img + "qr.png", SITE, { width: 480, margin: 1, color: { dark: "#0E1726", light: "#FFFFFF" } });

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(BASE + "/demo/#customer");
await wait(1200);
await page.locator("#customer-root").screenshot({ path: img + "shot-customer.png" });

await page.click("#customer-root .send-card");
await page.click('#customer-root [data-act="book"]');
await page.click('#customer-root [data-act="pay"]');
await page.click('[data-tab="rider"]');
await wait(900);
await page.locator("#rider-root").screenshot({ path: img + "shot-rider.png" });

await page.click('[data-tab="business"]');
await page.click('#business-root [data-page="new"]');
await page.click('#business-root [data-act="add-row"]');
await wait(500);
await page.locator(".pane-desk:not([hidden]) .desk-frame").screenshot({ path: img + "shot-business.png" });

await page.click('[data-tab="admin"]');
await page.click('#admin-root [data-page="riders"]');
await wait(500);
await page.locator(".pane-desk:not([hidden]) .desk-frame").screenshot({ path: img + "shot-admin.png" });

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(BASE + "/");
await og.waitForTimeout(800);
await og.addStyleTag({ content: ".nav{display:none}.hero{padding-top:44px!important}" });
await og.screenshot({ path: img + "og.png" });

await browser.close();
console.log("assets updated");
