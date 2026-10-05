// Local preview: serves the static site and the /api/chat function.
// Usage: GEMINI_API_KEY=xxx node scripts/dev-server.mjs   (key optional; the demo falls back to offline mode)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/chat.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf", ".json": "application/json", ".mp4": "video/mp4" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/chat") {
    let body = "";
    for await (const chunk of req) body += chunk;
    req.body = body ? JSON.parse(body) : {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    return handler(req, res);
  }
  let p = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!p.startsWith(root) || p.includes("node_modules")) { res.statusCode = 403; return res.end(); }
  try {
    if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    res.setHeader("content-type", types[extname(p)] || "application/octet-stream");
    res.end(await readFile(p));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(port, () => console.log(`Preview on http://localhost:${port}`));
