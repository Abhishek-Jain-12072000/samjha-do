// Cloudflare Pages Function — proxies requests to Workers AI (free tier).
// Deployed automatically with the site on Cloudflare Pages.
// End users never see a key. The only one-time setup is adding an "AI" binding
// to the Pages project (dashboard → Settings → Functions → Bindings → Workers AI).
//
// Free tier: 10,000 "neurons" per day per account. A typical document analysis
// with Llama 3.3 70B consumes ~10 neurons, so you get ~1000 analyses/day free.

const SYSTEM = 'You are Samjha Do, a legal document explainer for Indian users. Always respond with valid JSON only. No markdown, no code fences, no commentary.';

const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/qwen/qwen1.5-14b-chat-awq',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }
  if (!env.AI) {
    return json({ error: 'Workers AI binding missing. In Cloudflare Pages → Settings → Functions → Bindings, add a Workers AI binding named "AI".' }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const prompt = (body.prompt || '').slice(0, 30000);
  if (!prompt || prompt.length < 20) {
    return json({ error: 'Prompt too short' }, 400);
  }

  // Try models in order — falls back if one is overloaded or errors
  let lastErr;
  for (const model of MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });
      const text = result.response || result.result?.response || '';
      if (text && text.trim().length > 10) {
        return json({ text, model }, 200);
      }
      lastErr = new Error('empty response from ' + model);
    } catch (e) {
      lastErr = e;
    }
  }
  return json({ error: 'All Workers AI models failed. ' + (lastErr?.message || '') }, 502);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
