// Cloudflare Pages Function — proxies requests to Google Gemini (Flash Lite).
// The API key is stored as a secret in Cloudflare Pages:
//   Dashboard → Pages → your project → Settings → Environment variables
//   Variable name: GEMINI_API_KEY    (encrypt ✓)
// NEVER put the key in client-side code.

const SYSTEM = 'You are Samjha Do, a legal document explainer for Indian users. Always respond with valid JSON only. No markdown, no code fences, no commentary.';

const MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check: curl https://your-site.pages.dev/api/ai
  if (request.method === 'GET') {
    return json({
      ok: true,
      key: env.GEMINI_API_KEY ? 'GEMINI_API_KEY present ✅' : 'GEMINI_API_KEY MISSING ❌ — add it in Pages → Settings → Environment variables',
      model: MODEL,
    }, 200);
  }

  if (request.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY not set. In Cloudflare Pages → Settings → Environment variables, add GEMINI_API_KEY (encrypt ✓), then redeploy.' }, 500);
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
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
