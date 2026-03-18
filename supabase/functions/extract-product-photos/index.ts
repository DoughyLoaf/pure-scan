import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FRONT_LABEL_PROMPT = `You are an OCR system analyzing the FRONT of a food product. Extract structured data from the image. Return ONLY valid JSON.

Output format:
{
  "product_name": "string or null",
  "brand_name": "string or null",
  "size_weight": "string or null (e.g. '12 oz', '340g')",
  "certifications": ["array of visible certifications like 'USDA Organic', 'Non-GMO Project Verified', 'Gluten Free', 'Kosher', etc."],
  "category": "string (bread | snack | cereal | sauce | protein bar | bottled water | dairy | beverage | candy | chips | frozen meal | condiment | oil | supplement | other)",
  "is_water": true or false,
  "confidence": "high | medium | low"
}

Rules:
1. Extract text EXACTLY as printed
2. List ALL visible certification logos/text
3. If nothing is readable, return {"error": "no_label_visible"}
4. Never guess — only report what you can see`;

const INGREDIENTS_PROMPT = `You are an OCR system for a food label scanner. Extract the COMPLETE ingredient list from this image. Return ONLY valid JSON.

Output format:
{
  "ingredient_text_raw": "the COMPLETE ingredient list exactly as printed, or null if not visible",
  "ingredients_list": ["array", "of", "individual", "ingredients", "cleaned and separated"],
  "allergens": ["array of allergens if listed separately"],
  "confidence": "high | medium | low"
}

Rules:
1. Extract ingredient_text_raw EXACTLY as printed — do not correct spelling or reorder
2. Parse ingredients_list by splitting on commas, removing parenthetical sub-ingredients into the flat list
3. Confidence is high if ingredient list is fully readable, medium if partially readable, low if unclear
4. If no ingredient list is visible, return {"error": "no_ingredients_visible"}
5. Never invent or guess ingredients not visible in the image`;

async function callAI(systemPrompt: string, imageBase64: string): Promise<any> {
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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this product label image." },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
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
    if (response.status === 429) throw new Error("rate_limited");
    if (response.status === 402) throw new Error("credits_exhausted");
    throw new Error("ai_processing_failed");
  }

  const aiData = await response.json();
  const raw = aiData.choices?.[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("parse_failed");
  return JSON.parse(jsonMatch[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { step, image } = await req.json() as { step: "front" | "ingredients"; image: string };

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;

    if (step === "front") {
      result = await callAI(FRONT_LABEL_PROMPT, image);
    } else if (step === "ingredients") {
      result = await callAI(INGREDIENTS_PROMPT, image);
    } else {
      return new Response(JSON.stringify({ error: "Invalid step, must be 'front' or 'ingredients'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge function error:", err);

    const message = err?.message || "Unknown error";
    const isTimeout = err?.name === "AbortError";
    const status = isTimeout ? 504
      : message === "rate_limited" ? 429
      : message === "credits_exhausted" ? 402
      : 500;

    return new Response(JSON.stringify({ error: isTimeout ? "timeout" : message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
