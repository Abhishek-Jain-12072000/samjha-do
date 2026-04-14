// Cloudflare Worker — handles /api/ai route, static assets served automatically via [assets] in wrangler.toml
// Secret: GEMINI_API_KEY (set via `wrangler secret put GEMINI_API_KEY`)

const SYSTEM = 'You are Samjha Do, a legal document explainer for Indian users. Always respond with valid JSON only. No markdown, no code fences, no commentary.';
const MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

    // Only handle /api/ai — everything else falls through to static assets
    if (url.pathname !== '/api/ai') {
      // Return undefined / pass-through so the asset handler serves static files
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (request.method === 'GET') {
      return json({
        ok: true,
        key: env.GEMINI_API_KEY ? 'GEMINI_API_KEY present ✅' : 'GEMINI_API_KEY MISSING ❌ — run: wrangler secret put GEMINI_API_KEY',
        model: MODEL,
      }, 200);
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY not set. Run: wrangler secret put GEMINI_API_KEY' }, 500);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON body' }, 400); }

    const prompt = (body.prompt || '').slice(0, 30000);
    if (!prompt || prompt.length < 20) {
      return json({ error: 'Prompt too short' }, 400);
    }

    try {
      const r = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        console.error('Gemini error:', r.status, errText);
        return json({ error: `Gemini API error ${r.status}` }, 502);
      }

      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text || text.trim().length < 10) {
        return json({ error: 'Empty response from Gemini' }, 502);
      }

      return json({ text, model: MODEL }, 200);
    } catch (e) {
      console.error('Gemini fetch failed:', e);
      return json({ error: 'Failed to reach Gemini API: ' + (e.message || '') }, 502);
    }
  },
};
