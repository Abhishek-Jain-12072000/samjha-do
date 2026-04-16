# Samjha Do — समझा दो

**Don't sign — or swallow — what you don't understand.**

Two modes in one app:

- ⚖️ **Legal** — rent agreements, job offer letters, insurance, loan papers, court notices, NDAs. Flags traps, highlights obligations, checks legality, tells you what to ask before signing.
- 🏥 **Medical** — blood tests, lab reports, prescriptions, scan notes, discharge summaries. Explains each value with its reference range, flags abnormal results, surfaces possible conditions (never a diagnosis), suggests when to see a doctor and which specialist.

All in **Hindi (Devanagari)**, **English**, or **Hinglish**. Built for India. Open source. Free to deploy.

🔗 **Live:** [samjha-do.abhijainism2000.workers.dev](https://samjha-do.abhijainism2000.workers.dev)

---

## How It Works

```
User picks mode (⚖️ Legal  or  🏥 Medical)
        │
        ▼
User uploads document (PDF / DOCX / Image / Text)
        │
        ▼
   Browser parses it locally
   (PDF.js · mammoth.js · Tesseract OCR)
        │
        ▼
   Extracted text + mode sent to Cloudflare Worker
        │
        ▼
   Worker calls Groq API
     Legal  → Llama 3.1 8B (fast, ~1–2s)
     Health → Llama 3.3 70B (accurate, ~3–5s)
        │
        ▼
   Structured JSON analysis returned
        │
        ▼
   Mode-specific UI:
     Legal  → verdict, parties, obligations, money, dates,
              red flags, missing clauses, legality, bottom line
     Health → severity banner, test results w/ reference ranges,
              possible conditions, red flags, lifestyle, medications,
              when-to-see-doctor, specialist, questions, bottom line
              + full-screen takeover for critical findings
```

Documents are parsed entirely on the user's device. Only the extracted text leaves the browser — sent over HTTPS to the Cloudflare Worker, which forwards it to Groq's API. Nothing is stored.

---

## Features

### Common to both modes
- **Any format** — PDF, Word (.docx), images (JPG/PNG/WebP with OCR), plain text, or paste directly
- **Scanned document support** — Tesseract OCR (English + Hindi) runs client-side
- **Three languages** — Hindi (Devanagari), English, Hinglish — pick before upload, switch anytime
- **Per-mode, per-language caching** — switching languages uses cached results instantly; only fetches from AI if that combination hasn't been generated yet
- **Read aloud** — text-to-speech via Web Speech API (Hindi & English voices)
- **Speech auto-stops** on language switch or page reload
- **Zero setup for users** — no accounts, no API keys, no downloads
- **Color-coded UI** that adapts to the mode (orange/red for legal, teal/blue for health)

### ⚖️ Legal mode
- **Any document type** — rent agreements, offer letters, loan papers, insurance policies, court notices, NDAs, sale deeds
- **Verdict banner** — safe / caution / risky / dangerous
- **Plain summary** — no jargon, 3-5 paragraphs
- **Parties** — who's who in the document
- **Your obligations vs their obligations** — side by side
- **Money & amounts** — rent, deposits, fees, penalties
- **Key dates** — start, end, notice periods, renewals
- **Exit / termination terms** — how to get out, penalties
- **Red flags** — severity, clause reference, why it's bad, how to fix it
- **Missing clauses** — protections that should be there but aren't
- **Questions to ask** — before you sign, with reasons
- **Legality checklist** — stamp paper, registration, witnesses, governing law
- **Bottom line** — sign / sign with changes / don't sign / consult lawyer

### 🏥 Medical mode
- **Mandatory first-time consent** — one-time checkbox stored in localStorage making it clear this is NOT medical advice
- **Severity banner** — normal / minor / moderate / serious / critical
- **Full-screen critical takeover** — if the AI classifies the report as critical, it shows an emergency-style screen with tap-to-call links for 108 and 102 before the detailed report
- **Plain summary** — what the report is saying, in a sentence a parent would understand
- **Test-by-test table** — value, Indian reference range, status (normal / low / high / critical), and a one-line "what this means for you" for every test
- **Possible conditions** — phrased as "could suggest" only, never a diagnosis, with likelihood (possible / likely / unlikely)
- **Red flags** — with suggested action (retest, see doctor, go to ER, etc.)
- **Medications mentioned** — purpose and cautions for each drug named in the report
- **Diet & lifestyle** — practical changes for minor/moderate issues
- **When to see a doctor** — urgency tier (today / 24h / week / routine / emergency) + suggested specialist (GP, Cardiologist, Endocrinologist, etc.)
- **Questions to ask your doctor** — with the reasoning behind each one
- **Bottom line** — all_good / monitor / see_doctor / urgent / emergency

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Single `index.html` — vanilla JS, Tailwind CSS, no build step |
| PDF parsing | PDF.js (client-side) |
| Word parsing | mammoth.js (client-side) |
| OCR | Tesseract.js v5 (English + Hindi, client-side) |
| Fonts | Inter + Noto Sans Devanagari (Google Fonts) |
| Backend | Cloudflare Worker (proxies to Groq, keeps API key secret) |
| AI (Legal) | Groq — Llama 3.1 8B Instant (primary), Llama 3.3 70B (fallback) |
| AI (Health) | Groq — Llama 3.3 70B Versatile (primary), Llama 3.1 8B (fallback) |
| Hosting | Cloudflare Workers (free tier) |
| TTS | Web Speech API (browser-native) |

---

## Deploy Your Own (free, ~5 min)

### Prerequisites
- A free [Cloudflare](https://dash.cloudflare.com) account
- A free [Groq](https://console.groq.com) API key
- Node.js installed locally

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/samjha-do.git
cd samjha-do

# 2. Install wrangler (Cloudflare CLI)
npm install -g wrangler
wrangler login

# 3. Store your Groq API key as an encrypted secret
wrangler secret put GROQ_API_KEY
# paste your key when prompted

# 4. Deploy
wrangler deploy
```

That's it. Your site is live at `https://samjha-do.<your-account>.workers.dev`.

### Health check

```bash
curl https://samjha-do.<your-account>.workers.dev/api/ai
# → { "ok": true, "key": "GROQ_API_KEY present ✅", "models": [...] }
```

---

## Project Structure

```
samjha-do/
├── wrangler.toml           ← Cloudflare Worker config + static assets
├── src/
│   └── worker.js           ← API route /api/ai → Groq (Llama 3.1 8B)
├── public/
│   └── index.html          ← Entire app UI + client-side JS
└── README.md
```

Cloudflare serves `public/` as static assets. The Worker in `src/worker.js` handles `/api/ai` and proxies everything else to static files.

---

## Local Development

```bash
# Full local dev with API working
wrangler dev

# Or static-only (AI calls won't work)
cd public && python3 -m http.server 8000
```

`wrangler dev` runs at `http://localhost:8787` with the `/api/ai` route fully functional.

---

## Free Tier Limits

| Resource | Limit |
|---|---|
| Groq free tier | 14,400 requests/day, 30 requests/min |
| Cloudflare Workers free | 100,000 requests/day |
| Typical response time | 1–3 seconds |
| Tokens per analysis | ~800–1,200 (single language) |

For 50 document analyses per day, you're using ~0.3% of Groq's free quota.

---

## Privacy

- Documents are parsed and OCR'd **entirely on the user's device**
- Only the extracted text is sent to the Cloudflare Worker → Groq API over HTTPS
- **No data is stored** — not by the Worker, not by this app
- Groq's API terms: inputs are not used for model training
- The Groq API key is stored as an encrypted secret on Cloudflare, never exposed to the browser

---

## Contributing

PRs welcome. Some ideas:

- Add more Indian languages (Tamil, Telugu, Bengali, Marathi)
- Improve OCR accuracy for handwritten documents
- Add document comparison (compare two versions of a contract)
- Export analysis as PDF
- Add a "share analysis" feature

---

## License

MIT — fork it, ship it, improve it.

---

## Disclaimer

This is an AI-powered explanation tool — **not legal advice and NOT medical advice**.

- For high-stakes legal decisions (large loans, property purchases, court cases), always consult a qualified lawyer.
- For anything involving your health — especially medications, dosages, or the decision to delay / seek care — always verify with a qualified doctor. Medical mode is designed to help you understand a report so you can have a better conversation with your physician, nothing more.

The AI may miss nuances, misread values, or make errors. Use this as a starting point, not a final answer.

---

Built by [Abhishek Jain](https://github.com/your-username) & [Ritee Jain](https://github.com/RiteeJain14) · Made for India 🇮🇳
