import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Scoring rules (mirrored from src/lib/scoring.ts) ──
type Rule = [string, RegExp, string, number, string];
const RULES: Rule[] = [
  ["Canola Oil", /canola\s+oil/i, "Seed Oil", 15, ""],
  ["Soybean Oil", /soybean\s+oil/i, "Seed Oil", 15, ""],
  ["Sunflower Oil", /sunflower\s+oil/i, "Seed Oil", 15, ""],
  ["Corn Oil", /corn\s+oil/i, "Seed Oil", 15, ""],
  ["Cottonseed Oil", /cottonseed\s+oil/i, "Seed Oil", 15, ""],
  ["Vegetable Oil", /vegetable\s+oil/i, "Seed Oil", 15, ""],
  ["Rapeseed Oil", /rapeseed\s+oil/i, "Seed Oil", 15, ""],
  ["Red 40", /red\s*(no\.?\s*)?40|allura\s+red/i, "Artificial Dye", 10, ""],
  ["Yellow 5", /yellow\s*(no\.?\s*)?5|tartrazine/i, "Artificial Dye", 10, ""],
  ["Yellow 6", /yellow\s*(no\.?\s*)?6|sunset\s+yellow/i, "Artificial Dye", 10, ""],
  ["Blue 1", /blue\s*(no\.?\s*)?1|brilliant\s+blue/i, "Artificial Dye", 10, ""],
  ["Blue 2", /blue\s*(no\.?\s*)?2|indigo\s+carmine/i, "Artificial Dye", 10, ""],
  ["Red 3", /red\s*(no\.?\s*)?3|erythrosine/i, "Artificial Dye", 10, ""],
  ["Green 3", /green\s*(no\.?\s*)?3|fast\s+green/i, "Artificial Dye", 10, ""],
  ["BHA", /\bbha\b|butylated\s+hydroxyanisole/i, "Preservative", 10, ""],
  ["BHT", /\bbht\b|butylated\s+hydroxytoluene/i, "Preservative", 10, ""],
  ["TBHQ", /tbhq|tertiary\s+butylhydroquinone/i, "Preservative", 10, ""],
  ["Sodium Benzoate", /sodium\s+benzoate/i, "Preservative", 10, ""],
  ["Potassium Sorbate", /potassium\s+sorbate/i, "Preservative", 10, ""],
  ["Aspartame", /aspartame/i, "Artificial Sweetener", 12, ""],
  ["Sucralose", /sucralose/i, "Artificial Sweetener", 12, ""],
  ["Saccharin", /saccharin/i, "Artificial Sweetener", 12, ""],
  ["Acesulfame Potassium", /acesulfame[\s-]*(potassium|k)/i, "Artificial Sweetener", 12, ""],
  ["High Fructose Corn Syrup", /high[\s-]+fructose\s+corn\s+syrup|hfcs/i, "Added Sugar", 8, ""],
  ["Corn Syrup", /(?<!high[\s-]+fructose\s+)corn\s+syrup/i, "Added Sugar", 8, ""],
  ["Dextrose", /dextrose/i, "Added Sugar", 8, ""],
  ["Glucose Syrup", /glucose[\s-]+syrup|glucose[\s-]+fructose\s+syrup/i, "Added Sugar", 8, ""],
  ["Invert Sugar", /invert\s+sugar/i, "Added Sugar", 8, ""],
  ["Cane Sugar", /cane\s+sugar|evaporated\s+cane\s+juice/i, "Added Sugar", 8, ""],
  ["Polysorbate 80", /polysorbate\s+80/i, "Emulsifier", 7, ""],
  ["Carboxymethylcellulose", /carboxymethylcellulose|cellulose\s+gum|\bcmc\b/i, "Emulsifier", 7, ""],
  ["Soy Lecithin", /soy\s+lecithin/i, "Emulsifier", 7, ""],
  ["Mono and Diglycerides", /mono[\s-]+and[\s-]+diglycerides|mono[\s-]*diglycerides/i, "Emulsifier", 7, ""],
  ["Sodium Stearoyl Lactylate", /sodium\s+stearoyl\s+lactylate|\bssl\b/i, "Emulsifier", 7, ""],
  ["DATEM", /\bdatem\b|diacetyl\s+tartaric/i, "Emulsifier", 7, ""],
  ["Maltodextrin", /maltodextrin/i, "Ultra-Processed", 5, ""],
  ["Carrageenan", /carrageenan/i, "Ultra-Processed", 5, ""],
  ["Modified Starch", /modified\s+(corn\s+|food\s+)?starch/i, "Ultra-Processed", 5, ""],
  ["Artificial Flavor", /artificial\s+flavou?r/i, "Ultra-Processed", 5, ""],
  ["Natural Flavor", /natural\s+flavou?r/i, "Ultra-Processed", 5, ""],
  ["Sodium Nitrite", /sodium\s+nitrite/i, "Ultra-Processed", 5, ""],
  ["Titanium Dioxide", /titanium\s+dioxide/i, "Ultra-Processed", 5, ""],
];

function analyzeIngredients(raw: string) {
  const flaggedNames: string[] = [];
  const flaggedCategories = new Set<string>();
  let score = 100;
  for (const [name, pattern, category, deduction] of RULES) {
    if (pattern.test(raw)) {
      flaggedNames.push(name);
      flaggedCategories.add(category);
      score -= deduction;
    }
  }
  return { score: Math.max(0, score), flaggedNames, flaggedCategories: [...flaggedCategories], flaggedCount: flaggedNames.length };
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

const PRIORITY_BARCODES = [
  "014100044208", "016000275270", "038000138416", "044000032029",
  "021130126026", "028400090315", "040000529163", "016000442672",
  "018627100317", "722252400383", "853026003913", "840379000015",
];

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "PureApp/1.0 (seed-products)", "Connection": "keep-alive" },
      });
      return res;
    } catch (e) {
      console.log(`Fetch attempt ${i + 1} failed for ${url}: ${e.message}`);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

async function fetchOFFProduct(barcode: string) {
  const res = await fetchWithRetry(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res || !res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}

async function fetchOFFSearchPage(page: number) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&sort_by=unique_scans_n&page=${page}&fields=code,product_name,brands,ingredients_text,image_front_url,categories_tags`;
  const res = await fetchWithRetry(url);
  if (!res || !res.ok) return [];
  const data = await res.json();
  return data.products || [];
}

interface ImportResult {
  barcode: string;
  name: string;
  score: number;
  status: "added" | "skipped_duplicate" | "skipped_no_data" | "error";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: ImportResult[] = [];
  const seenBarcodes = new Set<string>();

  // Check which barcodes already exist
  const { data: existing } = await supabase
    .from("products")
    .select("barcode")
    .limit(10000);
  const existingSet = new Set((existing || []).map((r: any) => r.barcode));

  async function importProduct(p: any, barcode: string): Promise<ImportResult> {
    const name = p.product_name || "";
    const ingredients = p.ingredients_text || "";

    if (!barcode || !name || !ingredients) {
      return { barcode, name: name || "unknown", score: 0, status: "skipped_no_data" };
    }

    if (existingSet.has(barcode) || seenBarcodes.has(barcode)) {
      return { barcode, name, score: 0, status: "skipped_duplicate" };
    }
    seenBarcodes.add(barcode);

    try {
      const { score, flaggedNames, flaggedCategories, flaggedCount } = analyzeIngredients(ingredients);
      const brand = p.brands || "Unknown Brand";
      const imageUrl = p.image_front_url || "";
      const categoriesRaw = (p.categories_tags || []).join(",");
      const ingredientsHash = simpleHash(ingredients.toLowerCase().trim());

      const { error } = await supabase.from("products").insert({
        barcode,
        product_name: name,
        brand,
        pure_score: score,
        ingredients_raw: ingredients,
        flagged_count: flaggedCount,
        flagged_categories: flaggedCategories,
        flagged_ingredients: flaggedNames,
        categories_raw: categoriesRaw,
        image_url: imageUrl,
        is_water: false,
        water_brand: null,
        scan_count: 0,
        enrichment_source: "open_food_facts",
        data_confidence: "high",
        data_source: "open_food_facts",
        ingredients_hash: ingredientsHash,
        needs_review: false,
        manually_verified: false,
      });

      if (error) {
        // Likely unique constraint violation
        return { barcode, name, score, status: "skipped_duplicate" };
      }

      existingSet.add(barcode);
      return { barcode, name, score, status: "added" };
    } catch (e) {
      return { barcode, name: name || barcode, score: 0, status: "error" };
    }
  }

  // ── Phase 1: Priority barcodes ──
  for (const bc of PRIORITY_BARCODES) {
    const p = await fetchOFFProduct(bc);
    if (p) {
      results.push(await importProduct(p, bc));
    } else {
      results.push({ barcode: bc, name: "not found on OFF", score: 0, status: "skipped_no_data" });
    }
  }

  // ── Phase 2: Bulk import (3 pages × 200) ──
  for (let page = 1; page <= 3; page++) {
    const products = await fetchOFFSearchPage(page);
    for (const p of products) {
      const barcode = p.code;
      if (!barcode) continue;
      results.push(await importProduct(p, barcode));
    }
  }

  const added = results.filter((r) => r.status === "added");
  const skippedDup = results.filter((r) => r.status === "skipped_duplicate");
  const skippedNoData = results.filter((r) => r.status === "skipped_no_data");
  const errors = results.filter((r) => r.status === "error");

  const summary = {
    total_processed: results.length,
    added: added.length,
    skipped_duplicate: skippedDup.length,
    skipped_no_data: skippedNoData.length,
    errors: errors.length,
    priority_results: results.slice(0, PRIORITY_BARCODES.length),
    sample_added: added.slice(0, 20).map((r) => ({ barcode: r.barcode, name: r.name, score: r.score })),
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
