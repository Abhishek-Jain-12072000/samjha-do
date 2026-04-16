// Cloudflare Worker — /api/ai route using Groq (free tier, ultra-fast)
// Secret: GROQ_API_KEY (set via `wrangler secret put GROQ_API_KEY`)
// Free tier: 14,400 req/day, 30 req/min
// Get key free at: https://console.groq.com

const SYSTEM_LEGAL  = 'You are Samjha Do, a legal document explainer for Indian users. Always respond with valid JSON only. No markdown, no code fences, no commentary.';
const SYSTEM_HEALTH = 'You are Samjha Do Health, a medical report explainer for Indian users. You explain lab reports, prescriptions and doctor notes in plain language. You are NOT a doctor and you always tell the user to verify with a qualified physician. Always respond with valid JSON only. No markdown, no code fences, no commentary.';

// Legal mode: fast 8B model is enough for structured extraction.
// Health mode: use 70B for higher accuracy on reference ranges and conditions.
const MODELS_LEGAL  = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
const MODELS_HEALTH = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

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
        models_legal: MODELS_LEGAL,
        models_health: MODELS_HEALTH,
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

    const mode    = body.mode === 'health' ? 'health' : 'legal';
    const SYSTEM  = mode === 'health' ? SYSTEM_HEALTH : SYSTEM_LEGAL;
    const MODELS  = mode === 'health' ? MODELS_HEALTH : MODELS_LEGAL;

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
          return json({ text, model, mode }, 200);
        }
        lastErr = new Error('Empty response from ' + model);
      } catch (e) {
        lastErr = e;
      }
    }
    return json({ error: 'All models failed. ' + (lastErr?.message || '') }, 502);
  },
};
