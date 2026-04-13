# Samjha Do — समझा दो

Upload a rent agreement, offer letter, insurance policy, loan paper, or court notice → get a plain explanation in **Hindi, English, or Hinglish**, with red flags, key terms, legal-validity checks, and questions to ask before signing.

**For end users:** Zero setup. No API keys. No downloads. Just open the site and upload.
**For you (the deployer):** One 2-minute Cloudflare signup, then deploy free.

---

## Architecture

- **Frontend:** single `index.html` (Tailwind + PDF.js + mammoth + Tesseract OCR via CDNs)
- **AI backend:** **Cloudflare Workers AI** free tier (10,000 neurons/day ≈ ~1000 analyses/day), exposed as a Cloudflare Pages Function at `/api/ai`
- **Primary model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, with automatic fallback through Llama 3.1 8B, Mistral Small 3.1 24B, and Qwen 1.5 14B
- **Fallback backend:** Pollinations.ai (free public AI, no key) — used automatically if Cloudflare is down or the daily quota runs out
- **Zero keys exposed:** the Pages Function talks to Workers AI via a binding, never a secret in client code

---

## Deploy to Cloudflare Pages (free, ~3 min)

### 1. Push this folder to GitHub
Any free GitHub repo works. No workflow or build step needed.

### 2. Create the Pages project
1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (free account)
2. **Workers & Pages → Create application → Pages → Connect to Git**
3. Pick the repo you just pushed
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
5. Click **Save and Deploy**

Your site is now live at `https://samjha-do.pages.dev` (or your custom subdomain).

### 3. Add the Workers AI binding (the one crucial step)
1. Open your Pages project → **Settings → Functions → Bindings**
2. **Add binding → Workers AI**
3. Variable name: `AI` (exactly this — the function reads `env.AI`)
4. Save
5. Go to **Deployments** → redeploy the latest (bindings only apply to new deployments)

Done. The site at `https://samjha-do.pages.dev` is fully functional. End users upload a document, the browser calls `https://samjha-do.pages.dev/api/ai`, which runs Llama 3.3 70B on Cloudflare's edge, and returns the analysis.

### 4. (Optional) Deploy from CLI with wrangler instead
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy .
```
The `wrangler.toml` in this folder wires up the AI binding automatically.

---

## Free tier limits & fallback

| Limit | Value |
|---|---|
| Workers AI free quota | 10,000 neurons/day per Cloudflare account |
| Neurons per document analysis | ~8–15 (depends on doc length) |
| Analyses/day on free tier | **~700–1,200** |
| If quota exceeded | App auto-falls back to Pollinations (also free) |
| Cost above free tier | Cloudflare's published rates, pennies per 1000 calls |

No credit card required on signup. If you stay within free, Cloudflare never asks for one.

---

## Local development

`python3 -m http.server 8000` will serve the static files, but the `/api/ai` function only runs on Cloudflare. For local end-to-end testing:

```bash
npm install -g wrangler
wrangler pages dev . --ai AI
```

This emulates the Pages Function locally and lets you hit `http://localhost:8788/api/ai`.

Or skip local AI and use the Pollinations fallback: open `http://localhost:8000/?api=none` and the app will go straight to Pollinations.

---

## File structure

```
samjha-do/
├── index.html              ← the entire app UI + client JS
├── README.md               ← this file
├── wrangler.toml           ← optional — for `wrangler pages deploy`
└── functions/
    └── api/
        └── ai.js           ← Cloudflare Pages Function (runs as a Worker)
```

Cloudflare Pages auto-detects the `functions/` directory and turns each file into an API route at the corresponding path. `functions/api/ai.js` → `https://your-site.pages.dev/api/ai`.

---

## Features

- Upload PDF, DOCX, images (JPG/PNG/WebP), plain text — or paste text directly
- Scanned PDFs + images go through Tesseract OCR (English + Hindi) client-side
- Auto-classifies document type (rent / offer / loan / insurance / court / NDA / other)
- Plain explanation in **Hindi (Devanagari) / English / Hinglish** — toggle anytime
- Red flags with severity, key terms (amounts, dates, durations), questions to ask, legality checklist
- 🔊 Read-aloud via browser-native TTS (Web Speech API)
- Works on any modern browser, desktop or mobile

---

## Privacy

- Documents are parsed, OCR'd, and rendered entirely on the user's device
- Only the extracted text is sent to Cloudflare Workers AI for the explanation step
- Cloudflare's privacy policy covers Workers AI requests; nothing is stored by this app
- If you want 100% on-device with no cloud at all, use the Pollinations-off-by-default build and swap in a local model — but that requires a large download and WebGPU

---

## License

MIT. Fork it, ship it, improve it.

---

## Disclaimer

This is an AI explanation — **not legal advice**. For high-stakes decisions (large loans, court cases, property purchase), consult a qualified lawyer.
