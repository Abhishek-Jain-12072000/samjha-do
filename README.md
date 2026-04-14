# Samjha Do — समझा दो

Upload a rent agreement, offer letter, insurance policy, loan paper, or court notice → get a plain explanation in **Hindi, English, or Hinglish**, with red flags, key terms, legal-validity checks, and questions to ask before signing.

**For end users:** Zero setup. No API keys. No downloads. Just open the site and upload.
**For you (the deployer):** One Cloudflare account (free). No API keys needed.

---

## Architecture

- **Frontend:** single `index.html` in `public/` (Tailwind + PDF.js + mammoth + Tesseract OCR via CDNs)
- **AI backend:** **Cloudflare Workers AI** free tier (10,000 neurons/day), Llama 3.3 70B primary with auto-fallback
- **Zero keys needed:** Workers AI is accessed via a binding — no API key, no secrets, no env vars

---

## Deploy (free, ~3 min)

### 1. Push this folder to GitHub

### 2. Install wrangler & deploy
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

That's it. Your site is live at `https://samjha-do.<your-account>.workers.dev`.

### Health check
```
curl https://samjha-do.<your-account>.workers.dev/api/ai
```
Should return `{ "ok": true, "binding": "AI binding present ✅", ... }`.

---

## Local development

```bash
npm install -g wrangler
wrangler dev
```
Runs at `http://localhost:8787` with Workers AI working locally.

---

## File structure

```
samjha-do/
├── wrangler.toml           ← Worker config + AI binding + static assets
├── src/worker.js           ← handles /api/ai → Workers AI (Llama 3.3 70B)
├── public/index.html       ← the entire app UI + client JS
└── README.md
```

---

## Free tier limits

| Limit | Value |
|---|---|
| Workers AI free quota | 10,000 neurons/day |
| Neurons per analysis | ~8–15 (depends on doc length) |
| Analyses/day (free) | **~700–1,200** |
| Fallback models | Llama 3.1 8B, Mistral Small 3.1 24B |

No credit card required.

---

## Features

- Upload PDF, DOCX, images (JPG/PNG/WebP), plain text — or paste text directly
- Scanned PDFs + images → Tesseract OCR (English + Hindi) client-side
- Auto-classifies document type (rent / offer / loan / insurance / court / NDA / other)
- Verdict banner + bottom-line recommendation (sign / negotiate / don't sign / consult lawyer)
- Parties, obligations (yours vs theirs), money table, key dates, exit terms
- Red flags with severity, clause reference, explanation + suggested fix
- Missing clauses detection, questions to ask, legality checklist
- **Hindi (Devanagari) / English / Hinglish** — toggle anytime
- Read-aloud via browser TTS
- Works on any modern browser, desktop or mobile

---

## Privacy

- Documents are parsed and OCR'd entirely on the user's device
- Only extracted text is sent to Cloudflare Workers AI for analysis
- No data stored by this app

---

## License

MIT

---

## Disclaimer

This is an AI explanation — **not legal advice**. For high-stakes decisions, consult a qualified lawyer.
