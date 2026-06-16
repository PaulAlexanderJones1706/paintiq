// PaintIQ — serverless plan/photo analysis (Vercel function)
// Path: /api/analyse.js  →  callable at https://paintiq.au/api/analyse
// Keeps your Anthropic API key secret on the server (never in the browser).

export const config = { runtime: "edge" };

export default async function handler(req) {
  // CORS / preflight
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: cors });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers: cors }); }

  // body.files = [{ media_type, data(base64), kind:"pdf"|"image" }], body.mode = "plans"|"photos"
  const files = Array.isArray(body.files) ? body.files.slice(0, 6) : [];
  if (!files.length)
    return new Response(JSON.stringify({ error: "No files" }), { status: 400, headers: cors });

  const isPlans = body.mode === "plans";
  const prompt = isPlans
    ? `Analyse these architectural plans for a painting estimate. Return ONLY valid JSON (no markdown): {"units":number,"floorAreaPerUnit":number,"storeys":"1"|"2"|"3+","propertyType":"house"|"apartment"|"commercial"|"strata"}. If uncertain: units=1,floorAreaPerUnit=150,storeys="1".`
    : `Analyse these property photos for a painting estimate. Return ONLY valid JSON (no markdown): {"units":number,"floorAreaPerUnit":number,"storeys":"1"|"2"|"3+","propertyType":"house"|"apartment"|"commercial"|"strata","scope":"interior"|"exterior"|"both"}. If uncertain: units=1,floorAreaPerUnit=150,storeys="1",scope="both".`;

  const content = [
    ...files.map((f) =>
      f.kind === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }
        : { type: "image", source: { type: "base64", media_type: f.media_type, data: f.data } }
    ),
    { type: "text", text: prompt },
  ];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "Upstream error", detail: t.slice(0, 200) }), { status: 502, headers: cors });
    }
    const data = await r.json();
    const raw = data.content?.find((b) => b.type === "text")?.text || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return new Response(JSON.stringify({ ok: true, result: parsed }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Analysis failed" }), { status: 500, headers: cors });
  }
}
