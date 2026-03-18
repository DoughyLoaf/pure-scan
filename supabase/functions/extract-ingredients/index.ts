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
    const { images } = await req.json() as { images: string[] }; // base64 data URIs

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const content: any[] = [
      {
        type: "text",
        text: `You are a food ingredient extraction expert. Analyze the provided food product label image(s) and extract:

1. **product_name**: The name of the product (if visible on front label)
2. **brand**: The brand name (if visible)
3. **ingredients_raw**: The COMPLETE ingredient list exactly as written on the label. Copy every ingredient, preserving commas and parentheses. If you can't read some words clearly, make your best guess.

Return ONLY valid JSON with these three fields. Example:
{"product_name": "Crunchy Peanut Butter", "brand": "Jif", "ingredients_raw": "Roasted Peanuts, Sugar, Molasses, Fully Hydrogenated Vegetable Oils (Rapeseed And Soybean), Mono And Diglycerides, Salt"}

If you cannot read the ingredients at all, return: {"product_name": "", "brand": "", "ingredients_raw": ""}`,
      },
    ];

    for (const img of images) {
      // Strip the data URI prefix to get raw base64
      const base64Match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        content.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
    }

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
    });

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

    // Extract JSON from potential markdown code block
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
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
