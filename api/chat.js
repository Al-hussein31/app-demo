// Vercel serverless function: POST /api/chat
// Modes:
//   proposal – answers questions about the proposal (grounded in _knowledge.js)
//   booking  – the in-app AI agent: turns plain language into delivery bookings
//   admin    – the admin assistant: answers questions about the live demo state
//
// Requires the GEMINI_API_KEY environment variable. GEMINI_MODEL is optional.
// The core is platform-neutral: Vercel uses the default export below,
// Cloudflare Pages uses functions/api/chat.js.

import { KNOWLEDGE } from "./_knowledge.js";
import { AREAS } from "./_areas.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-flash-latest";
const MAX_MESSAGE = 1200;
const MAX_HISTORY = 12;

// Best-effort rate limit per warm instance.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 40;
}

const PROPOSAL_PROMPT = `You are the proposal assistant for Forge Growth's proposal to TTC (The Triple-Core) for the TTC Delivery Platform.
You speak on behalf of Hussein and the Forge Growth team to TTC's owners.

Rules:
- Answer ONLY from the facts below. Never invent prices, dates, features, guarantees or discounts.
- If the answer is not in the facts, say you don't want to guess, and that Hussein will answer it directly on WhatsApp — then give the best related fact you do have.
- Be warm, confident and brief: 2–5 short sentences, or a short list. Plain language for business owners, no jargon.
- Use ₦ amounts exactly as written in the facts.
- Never criticise other developers or proposals. Focus on what Forge Growth offers.
- If asked something unrelated to the proposal, the app or delivery businesses, politely steer back.

FACTS:
${KNOWLEDGE}`;

function bookingPrompt(defaultPickup) {
  return `You are the TTC AI delivery agent inside the TTC app (a motorcycle delivery service in Abuja, Nigeria).
Turn the user's message into delivery bookings. Users may write in English or Nigerian Pidgin.

Service areas (use these exact names for pickup and dropoff): ${AREAS.join(", ")}.
${defaultPickup ? `This user is a business. Their default pickup is "${defaultPickup}" — use it when they don't say where to pick up.` : "If the user doesn't give a pickup area, ask for it."}

Return JSON only:
- reply: a short friendly message (1–2 sentences). If booking, summarise what you've prepared and ask them to confirm. If something essential is missing (pickup or dropoff area), ask one short question.
- action: "book" when every delivery has a pickup and dropoff from the list; "ask" when you need more info; "chat" for general questions (prices are set by TTC and shown before confirming; tracking is live; payment by card, transfer or cash).
- deliveries: list of bookings (empty unless action is "book"). Each has pickup, dropoff (exact area names), item (short description), category (one of Food, Documents, Medicine, Parcel, Fragile), size (Small, Medium, Large), speed (Standard or Express), recipientName (or ""), recipientPhone (or ""), notes (or "").
If a place is not in the list, map it to the nearest listed area when obvious (e.g. "Banex Plaza" → Wuse 2, "Jabi Lake Mall" → Jabi, "Area 11" → Garki, "Transcorp Hilton" → Maitama, "Berger" → Wuse); otherwise ask.`;
}

const BOOKING_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    action: { type: "STRING" },
    deliveries: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          pickup: { type: "STRING" },
          dropoff: { type: "STRING" },
          item: { type: "STRING" },
          category: { type: "STRING" },
          size: { type: "STRING" },
          speed: { type: "STRING" },
          recipientName: { type: "STRING" },
          recipientPhone: { type: "STRING" },
          notes: { type: "STRING" }
        },
        required: ["pickup", "dropoff", "item", "category", "size", "speed"]
      }
    }
  },
  required: ["reply", "action", "deliveries"]
};

function adminPrompt(state) {
  return `You are the TTC admin assistant inside TTC's operations dashboard (motorcycle deliveries in Abuja).
Answer the operations manager's question using ONLY this live data (JSON). Be brief and practical: a direct answer, then at most 3 bullet points. Use ₦ for money. If the data can't answer it, say so.

LIVE DATA:
${state}`;
}

async function callGemini({ key, model, system, history, message, json }) {
  const contents = [
    ...history.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] }
  ];
  const generationConfig = { temperature: json ? 0.2 : 0.5, maxOutputTokens: 900 };
  if (json) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = BOOKING_SCHEMA;
  }
  if (/2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig })
  });
  if (!res.ok) {
    const err = new Error(`Gemini ${res.status}`);
    err.status = res.status;
    err.body = await res.text().catch(() => "");
    throw err;
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
}

function matchArea(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  return AREAS.find((a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === n)
    || AREAS.find((a) => n.includes(a.toLowerCase().replace(/[^a-z0-9]/g, "")))
    || null;
}

export async function chat({ method, body, ip, env }) {
  if (method !== "POST") return [405, { error: "POST only" }];
  if (!env.GEMINI_API_KEY) return [503, { error: "AI not configured" }];
  if (limited(ip)) return [429, { error: "Too many messages — please wait a few minutes." }];

  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const mode = body?.mode;
  const message = String(body?.message || "").slice(0, MAX_MESSAGE).trim();
  if (!message || !["proposal", "booking", "admin"].includes(mode)) {
    return [400, { error: "Bad request" }];
  }
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY)
    .filter((m) => m && typeof m.text === "string")
    .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text.slice(0, MAX_MESSAGE) }));

  let system;
  if (mode === "proposal") {
    const viewer = ["Farouk", "Imran", "Haiba"].find((n) => n.toLowerCase() === String(body.viewer || "").toLowerCase());
    system = PROPOSAL_PROMPT + (viewer ? `\n\nYou are talking to ${viewer}, one of TTC's owners. Address them by name naturally (not in every message).` : "");
    // Shows up in Vercel logs, so you can see what TTC asked and add it to the FAQ.
    console.log(JSON.stringify({ type: "proposal_question", at: new Date().toISOString(), question: message }));
  } else if (mode === "booking") {
    system = bookingPrompt(matchArea(body.defaultPickup));
  } else {
    system = adminPrompt(String(body.state || "{}").slice(0, 8000));
  }

  const opts = { key: env.GEMINI_API_KEY, system, history, message, json: mode === "booking" };
  let text;
  try {
    text = await callGemini({ ...opts, model: env.GEMINI_MODEL || DEFAULT_MODEL });
  } catch (e) {
    if (e.status === 404 && !env.GEMINI_MODEL) {
      try {
        text = await callGemini({ ...opts, model: FALLBACK_MODEL });
      } catch (e2) {
        console.error("gemini_error", e2.status, e2.body?.slice(0, 300));
        return [502, { error: "AI unavailable" }];
      }
    } else {
      console.error("gemini_error", e.status, e.body?.slice(0, 300));
      return [e.status === 429 ? 429 : 502, { error: "AI unavailable" }];
    }
  }

  if (mode !== "booking") return [200, { reply: text }];

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [200, { reply: "Sorry, I didn't catch that. Where should we pick up, and where are we delivering?", action: "ask", deliveries: [] }];
  }
  const deliveries = (parsed.deliveries || [])
    .map((d) => ({ ...d, pickup: matchArea(d.pickup), dropoff: matchArea(d.dropoff) }))
    .filter((d) => d.pickup && d.dropoff && d.pickup !== d.dropoff)
    .slice(0, 10);
  const action = parsed.action === "book" && deliveries.length ? "book" : parsed.action === "book" ? "ask" : parsed.action;
  return [200, { reply: parsed.reply || "", action, deliveries }];
}

// Vercel / Node adapter (also used by scripts/dev-server.mjs)
export default async function handler(req, res) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local";
  const [status, data] = await chat({ method: req.method, body: req.body, ip, env: process.env });
  res.status(status).json(data);
}
