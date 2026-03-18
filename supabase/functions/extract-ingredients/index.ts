import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { images } = await req.json() as { images: string[] };

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const content: any[] = [
      {
        type: "text",
        text: `You are a food ingredient label reader for a consumer health app. When shown a photo of a food product's ingredient list, extract ALL ingredients exactly as they appear on the label. Return ONLY a JSON object in this exact format:
{"ingredients_raw": "the complete raw ingredient text exactly as printed", "product_name": "product name if visible on label or null", "brand": "brand name if visible or null", "confidence": "high|medium|low"}

If you cannot read an ingredient list in the image, return:
{"error": "no_label_visible"}

Return only valid JSON, nothing else.`,
      },
    ];

    for (const img of images) {
      const base64Match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        content.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://lovable.dev/api/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", err);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const aiData = await response.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw }), {
        status: 422,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    console.error("Edge function error:", err);
    const isTimeout = err?.name === "AbortError";
    return new Response(JSON.stringify({ error: isTimeout ? "timeout" : "Internal error" }), {
      status: isTimeout ? 504 : 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
