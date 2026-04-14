// Cloudflare Worker — /api/ai route using Groq (free tier, ultra-fast)
// Secret: GROQ_API_KEY (set via `wrangler secret put GROQ_API_KEY`)
// Free tier: 14,400 req/day, 30 req/min — more than enough for 50 calls/day
// Get key free at: https://console.groq.com

const SYSTEM = 'You are Samjha Do, a legal document explainer for Indian users. Always respond with valid JSON only. No markdown, no code fences, no commentary.';

// llama-3.1-8b-instant = fastest on Groq (~1-2s), good quality for structured extraction
// llama-3.3-70b-versatile = higher quality fallback
const MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
];

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/ai') {
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (request.method === 'GET') {
      return json({
        ok: true,
        key: env.GROQ_API_KEY ? 'GROQ_API_KEY present ✅' : 'GROQ_API_KEY MISSING ❌ — run: wrangler secret put GROQ_API_KEY',
        models: MODELS,
      }, 200);
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: 'GROQ_API_KEY not set. Run: wrangler secret put GROQ_API_KEY' }, 500);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON body' }, 400); }

    const prompt = (body.prompt || '').slice(0, 30000);
    if (!prompt || prompt.length < 20) {
      return json({ error: 'Prompt too short' }, 400);
    }

    let lastErr;
    for (const model of MODELS) {
      try {
        const r = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
          }),
        });

        if (!r.ok) {
          const errText = await r.text();
          console.error(`Groq ${model} error:`, r.status, errText);
          lastErr = new Error(`Groq ${model}: HTTP ${r.status}`);
          continue;
        }

        const data = await r.json();
        const text = data?.choices?.[0]?.message?.content || '';

        if (text && text.trim().length > 10) {
          return json({ text, model }, 200);
        }
        lastErr = new Error('Empty response from ' + model);
      } catch (e) {
        lastErr = e;
      }
    }
    return json({ error: 'All models failed. ' + (lastErr?.message || '') }, 502);
  },
};
