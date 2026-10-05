# TTC Delivery Platform — Proposal by Forge Growth

Interactive proposal for The Triple-Core (TTC):

| Path | What it is |
|---|---|
| `/` | The proposal website (also prints to the PDF) with the AI proposal assistant |
| `/demo/` | Clickable prototype: Customer app, Business portal, Rider app, Admin dashboard, all sharing one live state |
| `/proposal/TTC-Proposal-Forge-Growth.pdf` | Signable PDF version, with a QR code back to the site |
| `/api/chat` | Serverless function that connects the bots to Google Gemini (key stays on the server) |

## Before sending: fill in your details

Edit **`assets/js/config.js`**. Everything marked `TODO`:

- phone, WhatsApp number (digits only, e.g. `2348012345678`), email
- the names and roles of your 3 team members (photos optional)
- confirm the one-line description of each project
- `testimonial.videoUrl`: YouTube/Vimeo/Loom link or an `.mp4` placed in `assets/video/`
- `launchVideoUrl`: the motion-graphics video, when ready

The proposal's facts for the AI assistant live in **`api/_knowledge.js`**. If you change a price or promise on the page, change it there too.

## Deploy to Vercel (about 5 minutes)

1. vercel.com → **Add New → Project** → import this GitHub repo. Framework preset: **Other**. No build command.
2. **Settings → Environment Variables** → add `GEMINI_API_KEY` = your Gemini key. Redeploy.
   Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`).
3. **Settings → Domains** → add `ttc.forgegrowth.ng`. At your domain provider, add a **CNAME** record: name `ttc`, value `cname.vercel-dns.com`.

Without a key everything still works: the bots fall back to answering from the FAQ, and the booking agent uses a built-in parser.

**See what TTC asks the bot:** Vercel → your project → **Logs**, search `proposal_question`.

## Run locally

```bash
npm install
GEMINI_API_KEY=your_key npm run serve     # http://localhost:4173
```

## Regenerate screenshots and the PDF

With the local server running:

```bash
npm run assets   # demo screenshots, QR code (SITE_URL=https://ttc.forgegrowth.ng), social image
npm run pdf      # proposal/TTC-Proposal-Forge-Growth.pdf
```

Re-run `npm run pdf` after editing `config.js` so the PDF shows your real team and contact details.
