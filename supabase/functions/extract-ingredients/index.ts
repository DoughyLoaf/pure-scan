import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are an OCR system for a food and water label scanner app. Extract structured data from the label image shown. Return ONLY valid JSON with no explanation.

Output format:

{
  "product_name": "string or null",
  "brand_name": "string or null",
  "barcode": "string (if barcode visible in image) or null",
  "category": "string (bread | snack | cereal | sauce | protein bar | bottled water | dairy | beverage | candy | chips | frozen meal | condiment | oil | supplement | other)",
  "is_water": true or false,
  "label_type": "food | water | cosmetic | supplement | unknown",
  "ingredient_text_raw": "the COMPLETE ingredient list exactly as printed, or null if not visible",
  "ingredients_list": ["array", "of", "individual", "ingredients", "cleaned and separated"],
  "water_data": {
    "ph": null,
    "tds_ppm": null,
    "source": "string or null",
    "type": "spring | purified | artesian | alkaline | volcanic | mineral | null"
  },
  "nutrition": {
    "serving_size": "string or null",
    "calories": null,
    "total_fat_g": null,
    "sodium_mg": null,
    "total_sugar_g": null,
    "protein_g": null
  },
  "label_coverage": "full | partial | back_only | front_only | none",
  "confidence": "high | medium | low"
}

Rules:
1. Extract ingredient_text_raw EXACTLY as printed — do not correct spelling or reorder
2. Parse ingredients_list by splitting on commas, removing parenthetical sub-ingredients into the flat list
3. If only partial label is visible, set label_coverage to partial and still extract what you can
4. For water bottles with no ingredient list, extract water_data fields instead
5. Set is_water to true if the product is any type of bottled water or water-based beverage
6. Capture barcode number if the barcode is visible anywhere in the image
7. If no label is visible at all, return: {"error": "no_label_visible"}
8. Never invent or guess ingredients not visible in the image
9. Confidence is high if ingredient list is fully readable, medium if partially readable, low if unclear
10. Always return valid JSON — never return text outside the JSON structure`;

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

    const content: any[] = [{ type: "text", text: "Analyze this food/water product label image." }];

    for (const img of images) {
      if (img.match(/^data:([^;]+);base64,(.+)$/)) {
        content.push({ type: "image_url", image_url: { url: img } });
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", response.status, err);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

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

    // Map to backward-compatible fields so Scanner.tsx keeps working
    if (!parsed.ingredients_raw && parsed.ingredient_text_raw) {
      parsed.ingredients_raw = parsed.ingredient_text_raw;
    }
    if (!parsed.product_name && parsed.brand_name) {
      parsed.product_name = parsed.brand_name;
    }
    if (!parsed.brand && parsed.brand_name) {
      parsed.brand = parsed.brand_name;
    }

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
