// Cloudflare Pages Function: POST /api/chat
// Set GEMINI_API_KEY (and optionally GEMINI_MODEL) under Pages → Settings → Variables and Secrets.
import { chat } from "../../api/chat.js";

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { /* handled as bad request */ }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const [status, data] = await chat({ method: "POST", body, ip, env });
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
