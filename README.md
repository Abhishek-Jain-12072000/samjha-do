# Samjha Do — समझा दो

Upload a rent agreement, offer letter, insurance policy, loan paper, or court notice → get a plain explanation in **Hindi, English, or Hinglish**, with red flags, key terms, legal-validity checks, and questions to ask before signing.

**For end users:** Zero setup. No API keys. No downloads. Just open the site and upload.
**For you (the deployer):** One 2-minute Cloudflare signup + a Google AI Studio key (free).

---

## Architecture

- **Frontend:** single `index.html` (Tailwind + PDF.js + mammoth + Tesseract OCR via CDNs)
- **AI backend:** **Google Gemini Flash Lite** via a Cloudflare Pages Function at `/api/ai`
- **Zero keys exposed:** the API key lives as an encrypted environment variable on Cloudflare — never in client code

---

## Deploy to Cloudflare Pages (free, ~5 min)

> **Important:** Do **not** add a `wrangler.toml` to the repo — its presence makes Cloudflare run the Workers deploy command instead of Pages, which breaks the build.

### 1. Get a Gemini API key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create a project → Get API Key → copy it

### 2. Push this folder to GitHub
Any free GitHub repo. No workflow, no build step, no config file needed.

### 3. Create the Pages project
1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (free account)
2. **Workers & Pages → Create application → Pages → Connect to Git**
3. Pick the repo you just pushed
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/` (or leave empty)
   - Root directory: `/`
5. Click **Save and Deploy**

### 4. Add the Gemini API key as a secret
1. Open your Pages project → **Settings → Environment variables**
2. Click **Add variable**
3. Variable name: `GEMINI_API_KEY`
4. Value: paste your Google AI Studio key
5. Check **Encrypt** ✓
6. Save
7. Go to **Deployments** → click the three-dot menu on the latest deployment → **Retry deployment** (env vars only take effect on new deployments)

Done. End users upload a document → `/api/ai` → Gemini Flash Lite → structured analysis returned.

### Health check

```
curl https://your-site.pages.dev/api/ai
```

Should return `{ "ok": true, "key": "GEMINI_API_KEY present ✅", "model": "gemini-2.0-flash-lite" }`.

---

## Local development

```bash
# Static files only (AI calls will fail without the Pages Function)
python3 -m http.server 8000

# Full local emulation with Pages Functions
npm install -g wrangler
echo 'GEMINI_API_KEY=your-key-here' > .dev.vars
wrangler pages dev .
```

This runs at `http://localhost:8788` with the `/api/ai` function working locally.

---

## File structure

```
samjha-do/
├── index.html              ← the entire app UI + client JS
├── README.md               ← this file
└── functions/
    └── api/
        └── ai.js           ← Cloudflare Pages Function (proxies to Gemini)
```

Cloudflare Pages auto-detects the `functions/` directory and turns each file into an API route. `functions/api/ai.js` → `https://your-site.pages.dev/api/ai`.

---

## Features

- Upload PDF, DOCX, images (JPG/PNG/WebP), plain text — or paste text directly
- Scanned PDFs + images → Tesseract OCR (English + Hindi) client-side
- Auto-classifies document type (rent / offer / loan / insurance / court / NDA / other)
- Verdict banner + bottom-line recommendation (sign / negotiate / don't sign / consult lawyer)
- Parties, obligations (yours vs theirs), money table, key dates, exit terms
- Red flags with severity, clause reference, explanation + suggested fix
- Missing clauses detection
- Questions to ask before signing
- Legality checklist (stamp paper, registration, witnesses, etc.)
- **Hindi (Devanagari) / English / Hinglish** — toggle anytime
- 🔊 Read-aloud via browser TTS
- Works on any modern browser, desktop or mobile

---

## Privacy

- Documents are parsed and OCR'd entirely on the user's device
- Only the extracted text is sent through Cloudflare to Gemini for analysis
- No data is stored by this app

---

## License

MIT. Fork it, ship it, improve it.

---

## Disclaimer

This is an AI explanation — **not legal advice**. For high-stakes decisions, consult a qualified lawyer.
