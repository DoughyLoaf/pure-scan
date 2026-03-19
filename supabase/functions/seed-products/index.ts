import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  ["Glucose Syrup", /glucose[\s-]+syrup|glucose[\s-]+fructose\s+syrup/i, "Added Sugar", 8],
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

function analyze(raw: string) {
  const flaggedNames: string[] = [];
  const cats = new Set<string>();
  let score = 100;
  for (const [name, pattern, category, ded] of RULES) {
    if (pattern.test(raw)) { flaggedNames.push(name); cats.add(category); score -= ded; }
  }
  return { score: Math.max(0, score), flaggedNames, flaggedCategories: [...cats], flaggedCount: flaggedNames.length };
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function safeFetch(url: string): Promise<any | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "PureApp/1.0" } });
      if (r.ok) return await r.json();
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

function buildRow(barcode: string, p: any) {
  const name = p.product_name || "";
  const ingredients = p.ingredients_text || "";
  if (!name || !ingredients) return null;
  const { score, flaggedNames, flaggedCategories, flaggedCount } = analyze(ingredients);
  return {
    barcode,
    product_name: name,
    brand: p.brands || "Unknown Brand",
    pure_score: score,
    ingredients_raw: ingredients,
    flagged_count: flaggedCount,
    flagged_categories: flaggedCategories,
    flagged_ingredients: flaggedNames,
    categories_raw: "",
    image_url: "",
    is_water: false,
    scan_count: 0,
    enrichment_source: "open_food_facts",
    data_confidence: "high",
    data_source: "open_food_facts",
    ingredients_hash: hash(ingredients.toLowerCase().trim()),
    needs_review: false,
    manually_verified: false,
  };
}

const SEARCH_URLS = [
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=snacks&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=cereals&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=beverages&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=dairy&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=condiments&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
  "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=200&tagtype_0=categories&tag_contains_0=contains&tag_0=frozen-foods&tagtype_1=countries&tag_contains_1=contains&tag_1=united-states&sort_by=unique_scans_n&fields=code,product_name,brands,ingredients_text",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Get existing barcodes
  const { data: existing } = await supabase.from("products").select("barcode").limit(10000);
  const existingSet = new Set((existing || []).map((r: any) => r.barcode));

  let added = 0, skippedDup = 0, skippedNoData = 0;
  const queryResults: { query: number; fetched: number; newAdded: number }[] = [];

  // Fetch all 7 queries in parallel
  const allData = await Promise.all(SEARCH_URLS.map(url => safeFetch(url)));

  for (let qi = 0; qi < allData.length; qi++) {
    const products = allData[qi]?.products || [];
    let queryAdded = 0;
    const toInsert: any[] = [];

    for (const p of products) {
      const bc = p.code;
      if (!bc || existingSet.has(bc)) { if (bc && existingSet.has(bc)) skippedDup++; continue; }
      const row = buildRow(bc, p);
      if (!row) { skippedNoData++; continue; }
      existingSet.add(bc);
      toInsert.push(row);
    }

    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("products").upsert(batch, { onConflict: "barcode", ignoreDuplicates: true });
      if (!error) { added += batch.length; queryAdded += batch.length; }
      else { console.error(`Query ${qi + 1} batch error:`, error.message); skippedDup += batch.length; }
    }

    queryResults.push({ query: qi + 1, fetched: products.length, newAdded: queryAdded });
  }

  // Get final count
  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });

  return new Response(JSON.stringify({
    total_products_in_db: count,
    newly_added: added,
    skipped_duplicate: skippedDup,
    skipped_no_data: skippedNoData,
    query_results: queryResults,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
