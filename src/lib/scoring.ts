import { supabase } from "@/integrations/supabase/client";

export interface FlaggedIngredient {
  name: string;
  category: string;
  deduction: number;
  reason: string;
  labelText: string;
}

export interface ProductResult {
  name: string;
  brand: string;
  score: number;
  ingredientsRaw: string;
  flagged: FlaggedIngredient[];
  imageUrl?: string;
  categoriesRaw?: string;
}

// [display name, regex, category, deduction, explanation]
type IngredientRule = [string, RegExp, string, number, string];

const RULES: IngredientRule[] = [
  // Seed oils — 15 pts each
  ["Canola Oil", /canola\s+oil/i, "Seed Oil", 15, "A processed seed oil high in omega-6 fatty acids, linked to inflammation."],
  ["Soybean Oil", /soybean\s+oil/i, "Seed Oil", 15, "A highly refined seed oil associated with oxidative stress and inflammatory responses."],
  ["Sunflower Oil", /sunflower\s+oil/i, "Seed Oil", 15, "A seed oil high in omega-6 that may promote inflammation when consumed in excess."],
  ["Corn Oil", /corn\s+oil/i, "Seed Oil", 15, "A refined seed oil with a high omega-6 to omega-3 ratio, linked to inflammatory processes."],
  ["Cottonseed Oil", /cottonseed\s+oil/i, "Seed Oil", 15, "A heavily processed oil from a non-food crop, often containing pesticide residues."],
  ["Vegetable Oil", /vegetable\s+oil/i, "Seed Oil", 15, "A generic term that typically refers to refined seed oils high in omega-6 fatty acids."],
  ["Rapeseed Oil", /rapeseed\s+oil/i, "Seed Oil", 15, "Another name for canola oil, a processed seed oil high in omega-6 fatty acids."],

  // Artificial dyes — 10 pts each
  ["Red 40", /red\s*(no\.?\s*)?40|allura\s+red/i, "Artificial Dye", 10, "A petroleum-based artificial dye linked to hyperactivity in children."],
  ["Yellow 5", /yellow\s*(no\.?\s*)?5|tartrazine/i, "Artificial Dye", 10, "A synthetic dye associated with allergic reactions and hyperactivity."],
  ["Yellow 6", /yellow\s*(no\.?\s*)?6|sunset\s+yellow/i, "Artificial Dye", 10, "A petroleum-derived dye linked to hyperactivity and allergic reactions."],
  ["Blue 1", /blue\s*(no\.?\s*)?1|brilliant\s+blue/i, "Artificial Dye", 10, "A synthetic dye with limited safety data on long-term consumption."],
  ["Blue 2", /blue\s*(no\.?\s*)?2|indigo\s+carmine/i, "Artificial Dye", 10, "A synthetic dye derived from petroleum, linked to allergic reactions."],
  ["Red 3", /red\s*(no\.?\s*)?3|erythrosine/i, "Artificial Dye", 10, "A synthetic dye banned in cosmetics but still allowed in food, linked to thyroid issues."],
  ["Green 3", /green\s*(no\.?\s*)?3|fast\s+green/i, "Artificial Dye", 10, "A synthetic dye with limited safety research and potential bladder tumor links."],

  // Synthetic preservatives — 10 pts each
  ["BHA", /\bbha\b|butylated\s+hydroxyanisole/i, "Preservative", 10, "A synthetic preservative classified as a possible human carcinogen."],
  ["BHT", /\bbht\b|butylated\s+hydroxytoluene/i, "Preservative", 10, "A synthetic antioxidant preservative with potential endocrine-disrupting effects."],
  ["TBHQ", /tbhq|tertiary\s+butylhydroquinone/i, "Preservative", 10, "A synthetic preservative derived from butane, linked to immune system disruption."],
  ["Sodium Benzoate", /sodium\s+benzoate/i, "Preservative", 10, "A preservative that may form benzene (a carcinogen) when combined with vitamin C."],
  ["Potassium Sorbate", /potassium\s+sorbate/i, "Preservative", 10, "A synthetic preservative that may cause allergic reactions and DNA damage at high doses."],

  // Artificial sweeteners — 12 pts each
  ["Aspartame", /aspartame/i, "Artificial Sweetener", 12, "An artificial sweetener with ongoing debate about neurological and metabolic effects."],
  ["Sucralose", /sucralose/i, "Artificial Sweetener", 12, "An artificial sweetener that may disrupt gut microbiome and insulin response."],
  ["Saccharin", /saccharin/i, "Artificial Sweetener", 12, "One of the oldest artificial sweeteners, previously linked to cancer in animal studies."],
  ["Acesulfame Potassium", /acesulfame[\s-]*(potassium|k)/i, "Artificial Sweetener", 12, "An artificial sweetener with limited long-term safety data."],

  // Added sugars — 8 pts each
  ["High Fructose Corn Syrup", /high[\s-]+fructose\s+corn\s+syrup|hfcs/i, "Added Sugar", 8, "A cheap industrial sweetener linked to obesity, insulin resistance, and fatty liver disease."],
  ["Corn Syrup", /(?<!high[\s-]+fructose\s+)corn\s+syrup/i, "Added Sugar", 8, "A highly processed liquid sugar that rapidly spikes blood glucose levels."],
  ["Dextrose", /dextrose/i, "Added Sugar", 8, "A simple sugar derived from corn, used to add sweetness and extend shelf life."],
  ["Glucose Syrup", /glucose[\s-]+syrup|glucose[\s-]+fructose\s+syrup/i, "Added Sugar", 8, "A concentrated sugar syrup that contributes to rapid blood sugar spikes and metabolic stress."],
  ["Invert Sugar", /invert\s+sugar/i, "Added Sugar", 8, "A liquid sugar processed with acid or enzymes, absorbed faster than table sugar."],
  ["Cane Sugar", /cane\s+sugar|evaporated\s+cane\s+juice/i, "Added Sugar", 8, "Refined sugar that provides empty calories with no nutritional benefit."],

  // Emulsifiers — 7 pts each
  ["Polysorbate 80", /polysorbate\s+80/i, "Emulsifier", 7, "A synthetic emulsifier linked to gut inflammation and impaired intestinal barrier function."],
  ["Carboxymethylcellulose", /carboxymethylcellulose|cellulose\s+gum|\bcmc\b/i, "Emulsifier", 7, "A synthetic thickener shown to promote gut inflammation and metabolic syndrome in animal studies."],
  ["Soy Lecithin", /soy\s+lecithin/i, "Emulsifier", 7, "A heavily processed byproduct of soybean oil production, often from GMO sources."],
  ["Mono and Diglycerides", /mono[\s-]+and[\s-]+diglycerides|mono[\s-]*diglycerides/i, "Emulsifier", 7, "Synthetic fat-based emulsifiers that may contain trans fats not required to be listed on labels."],
  ["Sodium Stearoyl Lactylate", /sodium\s+stearoyl\s+lactylate|\bssl\b/i, "Emulsifier", 7, "A synthetic emulsifier used as a dough conditioner with limited long-term safety data."],
  ["DATEM", /\bdatem\b|diacetyl\s+tartaric/i, "Emulsifier", 7, "A dough conditioner derived from tartaric acid and fatty acids, common in commercial bread."],

  // Ultra-processed additives — 5 pts each
  ["Maltodextrin", /maltodextrin/i, "Ultra-Processed", 5, "A highly processed starch that spikes blood sugar faster than table sugar."],
  ["Carrageenan", /carrageenan/i, "Ultra-Processed", 5, "A thickener linked to gastrointestinal inflammation and digestive issues."],
  ["Modified Starch", /modified\s+(corn\s+|food\s+)?starch/i, "Ultra-Processed", 5, "A chemically or physically altered starch used as a thickener in processed foods."],
  ["Artificial Flavor", /artificial\s+flavou?r/i, "Ultra-Processed", 5, "A synthetic chemical blend with undisclosed compounds used to mimic natural taste."],
  ["Natural Flavor", /natural\s+flavou?r/i, "Ultra-Processed", 5, "A vague label that can include processed chemical compounds derived from natural sources."],
  ["Sodium Nitrite", /sodium\s+nitrite/i, "Ultra-Processed", 5, "A preservative in processed meats that can form carcinogenic nitrosamines during cooking."],
  ["Titanium Dioxide", /titanium\s+dioxide/i, "Ultra-Processed", 5, "A whitening agent banned in EU food products due to genotoxicity concerns."],
];

function extractLabelContext(raw: string, pattern: RegExp): string {
  const match = raw.match(pattern);
  if (!match || match.index === undefined) return match?.[0] ?? "";

  const start = Math.max(0, raw.lastIndexOf(",", match.index) + 1);
  let end = raw.indexOf(",", match.index + match[0].length);
  if (end === -1) end = raw.length;

  return raw.slice(start, end).trim().replace(/^[\s,]+|[\s,]+$/g, "");
}

export function analyzeIngredients(rawText: string): { score: number; flagged: FlaggedIngredient[] } {
  const flagged: FlaggedIngredient[] = [];

  for (const [name, pattern, category, deduction, reason] of RULES) {
    if (pattern.test(rawText)) {
      flagged.push({
        name,
        category,
        deduction,
        reason,
        labelText: extractLabelContext(rawText, pattern),
      });
    }
  }

  let score = 100;
  for (const flag of flagged) {
    score -= flag.deduction;
  }
  score = Math.max(0, score);

  return { score, flagged };
}

const CACHE_PREFIX = "pure_product_";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedProduct(barcode: string): ProductResult | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + barcode);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + barcode);
      return null;
    }
    return data as ProductResult;
  } catch {
    return null;
  }
}

function cacheProduct(barcode: string, product: ProductResult) {
  try {
    localStorage.setItem(CACHE_PREFIX + barcode, JSON.stringify({ data: product, ts: Date.now() }));
  } catch {
    // Storage full or unavailable
  }
}

export async function fetchProduct(barcode: string): Promise<ProductResult | null> {
  const cached = getCachedProduct(barcode);
  if (cached) {
    console.log('[fetchProduct] Cache hit for', barcode);
    return cached;
  }

  // 1. Check our products database first
  try {
    const { data: dbProduct } = await supabase
      .from('products')
      .select('product_name, brand, pure_score, ingredients_raw, flagged_ingredients, flagged_categories, image_url, categories_raw')
      .eq('barcode', barcode)
      .maybeSingle();

    if (dbProduct && dbProduct.ingredients_raw) {
      console.log('[fetchProduct] DB hit for', barcode, dbProduct.product_name);
      const { score, flagged } = analyzeIngredients(dbProduct.ingredients_raw);
      const result: ProductResult = {
        name: dbProduct.product_name,
        brand: dbProduct.brand || 'Unknown Brand',
        score,
        ingredientsRaw: dbProduct.ingredients_raw,
        flagged,
        imageUrl: dbProduct.image_url || undefined,
        categoriesRaw: dbProduct.categories_raw || '',
      };
      cacheProduct(barcode, result);
      return result;
    }
  } catch (err) {
    console.error('[fetchProduct] DB lookup error:', err);
  }

  // 2. Fall back to Open Food Facts API
  console.log('[fetchProduct] Fetching from OFF for', barcode);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.product) return null;

    const product = data.product;
    const name = product.product_name || "Unknown Product";
    const brand = product.brands || "Unknown Brand";
    const ingredientsRaw = product.ingredients_text || "";

    if (!ingredientsRaw) return null;

    const imageUrl = product.image_front_url || product.image_front_small_url || undefined;
    const categoriesRaw = product.categories_tags?.join(',') ?? '';
    const { score, flagged } = analyzeIngredients(ingredientsRaw);
    const result: ProductResult = { name, brand, score, ingredientsRaw, flagged, imageUrl, categoriesRaw };

    cacheProduct(barcode, result);

    // 3. Save to our DB for future lookups (non-blocking)
    supabase.rpc('upsert_product', {
      p_barcode: barcode,
      p_product_name: name,
      p_brand: brand,
      p_pure_score: score,
      p_ingredients_raw: ingredientsRaw,
      p_flagged_count: flagged.length,
      p_flagged_categories: [...new Set(flagged.map(f => f.category))],
      p_flagged_ingredients: flagged.map(f => f.name),
      p_categories_raw: categoriesRaw,
      p_image_url: imageUrl || '',
      p_is_water: false,
      p_water_brand: '',
    }).then(({ error }) => {
      if (error) console.error('[fetchProduct] DB save error:', error);
      else console.log('[fetchProduct] Saved to DB:', barcode);
    });

    return result;
  } catch (err) {
    console.error('[fetchProduct] OFF fetch error:', err);
    return null;
  }
}
