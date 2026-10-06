// Copies only the public website into dist/ (used by Cloudflare Pages).
// The API runs from functions/api/chat.js, so api/ stays out of the public output.
import { cpSync, rmSync, mkdirSync } from "node:fs";

const out = "dist";
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const p of ["index.html", "favicon.svg", "assets", "demo", "proposal"]) {
  cpSync(p, `${out}/${p}`, { recursive: true });
}
console.log("Built dist/");
