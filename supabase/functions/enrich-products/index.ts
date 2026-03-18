import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Scoring engine (mirror of src/lib/scoring.ts)
type Rule = [string, RegExp, string, number];
const RULES: Rule[] = [
  ["Canola Oil", /canola\s+oil/i, "Seed Oil", 15],
  ["Soybean Oil", /soybean\s+oil/i, "Seed Oil", 15],
  ["Sunflower Oil", /sunflower\s+oil/i, "Seed Oil", 15],
  ["Corn Oil", /corn\s+oil/i, "Seed Oil", 15],
  ["Cottonseed Oil", /cottonseed\s+oil/i, "Seed Oil", 15],
  ["Vegetable Oil", /vegetable\s+oil/i, "Seed Oil", 15],
  ["Rapeseed Oil", /rapeseed\s+oil/i, "Seed Oil", 15],
  ["Red 40", /red\s*(no\.?\s*)?40|allura\s+red/i, "Artificial Dye", 10],
  ["Yellow 5", /yellow\s*(no\.?\s*)?5|tartrazine/i, "Artificial Dye", 10],
  ["Yellow 6", /yellow\s*(no\.?\s*)?6|sunset\s+yellow/i, "Artificial Dye", 10],
  ["Blue 1", /blue\s*(no\.?\s*)?1|brilliant\s+blue/i, "Artificial Dye", 10],
  ["Blue 2", /blue\s*(no\.?\s*)?2|indigo\s+carmine/i, "Artificial Dye", 10],
  ["Red 3", /red\s*(no\.?\s*)?3|erythrosine/i, "Artificial Dye", 10],
  ["Green 3", /green\s*(no\.?\s*)?3|fast\s+green/i, "Artificial Dye", 10],
  ["BHA", /\bbha\b|butylated\s+hydroxyanisole/i, "Preservative", 10],
  ["BHT", /\bbht\b|butylated\s+hydroxytoluene/i, "Preservative", 10],
  ["TBHQ", /tbhq|tertiary\s+butylhydroquinone/i, "Preservative", 10],
  ["Sodium Benzoate", /sodium\s+benzoate/i, "Preservative", 10],
  ["Potassium Sorbate", /potassium\s+sorbate/i, "Preservative", 10],
  ["Aspartame", /aspartame/i, "Artificial Sweetener", 12],
  ["Sucralose", /sucralose/i, "Artificial Sweetener", 12],
  ["Saccharin", /saccharin/i, "Artificial Sweetener", 12],
  ["Acesulfame Potassium", /acesulfame[\s-]*(potassium|k)/i, "Artificial Sweetener", 12],
  ["High Fructose Corn Syrup", /high[\s-]+fructose\s+corn\s+syrup|hfcs/i, "Added Sugar", 8],
  ["Corn Syrup", /(?<!high[\s-]+fructose\s+)corn\s+syrup/i, "Added Sugar", 8],
  ["Dextrose", /dextrose/i, "Added Sugar", 8],
  ["Glucose Syrup", /glucose[\s-]+syrup/i, "Added Sugar", 8],
  ["Invert Sugar", /invert\s+sugar/i, "Added Sugar", 8],
  ["Cane Sugar", /cane\s+sugar|evaporated\s+cane\s+juice/i, "Added Sugar", 8],
  ["Polysorbate 80", /polysorbate\s+80/i, "Emulsifier", 7],
  ["Carboxymethylcellulose", /carboxymethylcellulose|cellulose\s+gum|\bcmc\b/i, "Emulsifier", 7],
  ["Soy Lecithin", /soy\s+lecithin/i, "Emulsifier", 7],
  ["Mono and Diglycerides", /mono[\s-]+and[\s-]+diglycerides|mono[\s-]*diglycerides/i, "Emulsifier", 7],
  ["Sodium Stearoyl Lactylate", /sodium\s+stearoyl\s+lactylate|\bssl\b/i, "Emulsifier", 7],
  ["DATEM", /\bdatem\b|diacetyl\s+tartaric/i, "Emulsifier", 7],
  ["Maltodextrin", /maltodextrin/i, "Ultra-Processed", 5],
  ["Carrageenan", /carrageenan/i, "Ultra-Processed", 5],
  ["Modified Starch", /modified\s+(corn\s+|food\s+)?starch/i, "Ultra-Processed", 5],
  ["Artificial Flavor", /artificial\s+flavou?r/i, "Ultra-Processed", 5],
  ["Natural Flavor", /natural\s+flavou?r/i, "Ultra-Processed", 5],
  ["Sodium Nitrite", /sodium\s+nitrite/i, "Ultra-Processed", 5],
  ["Titanium Dioxide", /titanium\s+dioxide/i, "Ultra-Processed", 5],
];

function analyzeIngredients(raw: string) {
  const flaggedNames: string[] = [];
  const flaggedCategories: string[] = [];
  let score = 100;
  for (const [name, pattern, category, deduction] of RULES) {
    if (pattern.test(raw)) {
      flaggedNames.push(name);
      if (!flaggedCategories.includes(category)) flaggedCategories.push(category);
      score -= deduction;
    }
  }
  return { score: Math.max(0, score), flaggedNames, flaggedCategories, flaggedCount: flaggedNames.length };
}

interface EnrichResult {
  id: string;
  product_name: string | null;
  status: string;
  pure_score: number | null;
  flagged_count: number;
  source: string;
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: EnrichResult[] = [];

  // 1. Process enrichment_queue pending items
  const { data: pendingItems, error: fetchErr } = await supabase
    .from("enrichment_queue")
    .select("*")
    .eq("processing_status", "pending")
    .order("created_at", { ascending: true });

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const item of pendingItems ?? []) {
    const now = new Date().toISOString();
    const attempts = (item.attempts ?? 0) + 1;

    // PATH A: Has barcode → call Open Food Facts
    if (item.barcode) {
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${item.barcode}.json`
        );
        const data = await res.json();

        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = p.product_name || item.product_name || "Unknown";
          const brand = p.brands || item.brand || "Unknown";
          const ingredientsRaw = p.ingredients_text || item.ingredient_text_raw || "";
          const imageUrl = p.image_front_url || "";
          const categoriesRaw = p.categories_tags?.join(",") ?? "";
          const { score, flaggedNames, flaggedCategories, flaggedCount } =
            analyzeIngredients(ingredientsRaw);

          // Upsert into products
          await supabase.rpc("upsert_product", {
            p_barcode: item.barcode,
            p_product_name: name,
            p_brand: brand,
            p_pure_score: score,
            p_ingredients_raw: ingredientsRaw,
            p_flagged_count: flaggedCount,
            p_flagged_categories: flaggedCategories,
            p_flagged_ingredients: flaggedNames,
            p_categories_raw: categoriesRaw,
            p_image_url: imageUrl,
            p_is_water: false,
            p_water_brand: "",
          });

          // Update enrichment status
          await supabase
            .from("enrichment_queue")
            .update({
              processing_status: "enriched",
              attempts,
              last_attempted_at: now,
              enriched_at: now,
            })
            .eq("id", item.id);

          results.push({
            id: item.id,
            product_name: name,
            status: "enriched",
            pure_score: score,
            flagged_count: flaggedCount,
            source: "open_food_facts",
            detail: `Found via barcode ${item.barcode}`,
          });
        } else {
          // Not found in OFF — but we have ingredient text, so score it directly
          if (item.ingredient_text_raw) {
            const { score, flaggedNames, flaggedCategories, flaggedCount } =
              analyzeIngredients(item.ingredient_text_raw);

            await supabase
              .from("enrichment_queue")
              .update({
                processing_status: "enriched",
                attempts,
                last_attempted_at: now,
                enriched_at: now,
                error_message: "Barcode not found in OFF; scored from extracted text",
              })
              .eq("id", item.id);

            results.push({
              id: item.id,
              product_name: item.product_name,
              status: "enriched",
              pure_score: score,
              flagged_count: flaggedCount,
              source: "extracted_text",
              detail: `Barcode ${item.barcode} not in OFF; scored from photo extraction`,
            });
          } else {
            await supabase
              .from("enrichment_queue")
              .update({
                processing_status: "not_found",
                attempts,
                last_attempted_at: now,
                error_message: "Not found in Open Food Facts and no ingredient text",
              })
              .eq("id", item.id);

            results.push({
              id: item.id,
              product_name: item.product_name,
              status: "not_found",
              pure_score: null,
              flagged_count: 0,
              source: "none",
              detail: `Barcode ${item.barcode} not found, no text to score`,
            });
          }
        }
      } catch (err: any) {
        await supabase
          .from("enrichment_queue")
          .update({
            processing_status: "failed",
            attempts,
            last_attempted_at: now,
            error_message: err?.message || "Unknown error",
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          product_name: item.product_name,
          status: "failed",
          pure_score: null,
          flagged_count: 0,
          source: "error",
          detail: err?.message || "API call failed",
        });
      }
      continue;
    }

    // PATH B: No barcode — score from extracted ingredient text
    if (item.ingredient_text_raw) {
      const { score, flaggedNames, flaggedCategories, flaggedCount } =
        analyzeIngredients(item.ingredient_text_raw);

      // Generate a pseudo-barcode for storage
      const pseudoBarcode = `photo_${item.id.slice(0, 8)}`;
      const name = item.product_name || "Photo Scanned Product";
      const brand = item.brand || "Unknown Brand";

      await supabase.rpc("upsert_product", {
        p_barcode: pseudoBarcode,
        p_product_name: name,
        p_brand: brand,
        p_pure_score: score,
        p_ingredients_raw: item.ingredient_text_raw,
        p_flagged_count: flaggedCount,
        p_flagged_categories: flaggedCategories,
        p_flagged_ingredients: flaggedNames,
        p_categories_raw: "",
        p_image_url: "",
        p_is_water: false,
        p_water_brand: "",
      });

      await supabase
        .from("enrichment_queue")
        .update({
          processing_status: "enriched",
          attempts,
          last_attempted_at: now,
          enriched_at: now,
        })
        .eq("id", item.id);

      results.push({
        id: item.id,
        product_name: name,
        status: "enriched",
        pure_score: score,
        flagged_count: flaggedCount,
        source: "extracted_text",
        detail: "Scored from photo-extracted ingredient text",
      });
    } else {
      await supabase
        .from("enrichment_queue")
        .update({
          processing_status: "not_found",
          attempts,
          last_attempted_at: now,
          error_message: "No barcode and no ingredient text available",
        })
        .eq("id", item.id);

      results.push({
        id: item.id,
        product_name: item.product_name,
        status: "not_found",
        pure_score: null,
        flagged_count: 0,
        source: "none",
        detail: "No data to enrich",
      });
    }
  }

  // 2. Also process unknown_barcodes
  const { data: unknowns } = await supabase
    .from("unknown_barcodes")
    .select("*")
    .order("scan_count", { ascending: false });

  for (const ub of unknowns ?? []) {
    // Skip if already in products
    const { data: existing } = await supabase
      .from("products")
      .select("barcode")
      .eq("barcode", ub.barcode)
      .maybeSingle();

    if (existing) {
      results.push({
        id: ub.id,
        product_name: null,
        status: "already_exists",
        pure_score: null,
        flagged_count: 0,
        source: "products_table",
        detail: `Barcode ${ub.barcode} already in products`,
      });
      continue;
    }

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${ub.barcode}.json`
      );
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || "Unknown";
        const brand = p.brands || "Unknown";
        const ingredientsRaw = p.ingredients_text || "";
        const imageUrl = p.image_front_url || "";
        const categoriesRaw = p.categories_tags?.join(",") ?? "";
        const { score, flaggedNames, flaggedCategories, flaggedCount } =
          analyzeIngredients(ingredientsRaw);

        await supabase.rpc("upsert_product", {
          p_barcode: ub.barcode,
          p_product_name: name,
          p_brand: brand,
          p_pure_score: score,
          p_ingredients_raw: ingredientsRaw,
          p_flagged_count: flaggedCount,
          p_flagged_categories: flaggedCategories,
          p_flagged_ingredients: flaggedNames,
          p_categories_raw: categoriesRaw,
          p_image_url: imageUrl,
          p_is_water: false,
          p_water_brand: "",
        });

        // Remove from unknown_barcodes since it's now known
        await supabase.from("unknown_barcodes").delete().eq("id", ub.id);

        results.push({
          id: ub.id,
          product_name: name,
          status: "enriched",
          pure_score: score,
          flagged_count: flaggedCount,
          source: "open_food_facts",
          detail: `Unknown barcode ${ub.barcode} found and added`,
        });
      } else {
        results.push({
          id: ub.id,
          product_name: null,
          status: "not_found",
          pure_score: null,
          flagged_count: 0,
          source: "open_food_facts",
          detail: `Barcode ${ub.barcode} not in Open Food Facts`,
        });
      }
    } catch (err: any) {
      results.push({
        id: ub.id,
        product_name: null,
        status: "failed",
        pure_score: null,
        flagged_count: 0,
        source: "error",
        detail: err?.message || "API call failed",
      });
    }
  }

  const summary = {
    total_processed: results.length,
    enriched: results.filter((r) => r.status === "enriched").length,
    not_found: results.filter((r) => r.status === "not_found").length,
    failed: results.filter((r) => r.status === "failed").length,
    already_exists: results.filter((r) => r.status === "already_exists").length,
    results,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
