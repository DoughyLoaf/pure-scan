export interface FlaggedIngredient {
  name: string;
  reason: string;
  labelText: string;
}

export interface ProductResult {
  name: string;
  brand: string;
  score: number;
  ingredientsRaw: string;
  flagged: FlaggedIngredient[];
}

// Patterns: [display name, regex, explanation]
const FLAGGED_PATTERNS: [string, RegExp, string][] = [
  ["Canola Oil", /canola\s+oil/i, "A processed seed oil high in omega-6 fatty acids, linked to inflammation."],
  ["Soybean Oil", /soybean\s+oil/i, "A highly refined seed oil associated with oxidative stress and inflammatory responses."],
  ["Sunflower Oil", /sunflower\s+oil/i, "A seed oil high in omega-6 that may promote inflammation when consumed in excess."],
  ["Corn Oil", /corn\s+oil/i, "A refined seed oil with a high omega-6 to omega-3 ratio, linked to inflammatory processes."],
  ["Cottonseed Oil", /cottonseed\s+oil/i, "A heavily processed oil from a non-food crop, often containing pesticide residues."],
  ["Vegetable Oil", /vegetable\s+oil/i, "A generic term that typically refers to refined seed oils high in omega-6 fatty acids."],
  ["Palm Oil", /palm\s+oil/i, "A highly processed oil linked to environmental concerns and potentially inflammatory."],
  ["Safflower Oil", /safflower\s+oil/i, "A seed oil high in omega-6 fatty acids that may contribute to inflammation."],
  ["Maltodextrin", /maltodextrin/i, "A highly processed starch that spikes blood sugar faster than table sugar."],
  ["Artificial Flavor", /artificial\s+flavou?r/i, "A synthetic chemical blend with undisclosed compounds used to mimic natural taste."],
  ["Natural Flavor", /natural\s+flavou?r/i, "A vague label that can include processed chemical compounds derived from natural sources."],
  ["High Fructose Corn Syrup", /high\s+fructose\s+corn\s+syrup/i, "A highly refined sweetener linked to metabolic dysfunction and fatty liver disease."],
  ["Aspartame", /aspartame/i, "An artificial sweetener with ongoing debate about neurological and metabolic effects."],
  ["Sucralose", /sucralose/i, "An artificial sweetener that may disrupt gut microbiome and insulin response."],
  ["Acesulfame Potassium", /acesulfame[\s-]*(potassium|k)/i, "An artificial sweetener with limited long-term safety data."],
  ["MSG", /monosodium\s+glutamate|msg/i, "A flavor enhancer that may cause adverse reactions in sensitive individuals."],
  ["TBHQ", /tbhq|tertiary\s+butylhydroquinone/i, "A synthetic preservative derived from butane, linked to immune system disruption."],
  ["BHA", /\bbha\b|butylated\s+hydroxyanisole/i, "A synthetic preservative classified as a possible human carcinogen."],
  ["BHT", /\bbht\b|butylated\s+hydroxytoluene/i, "A synthetic antioxidant preservative with potential endocrine-disrupting effects."],
  ["Sodium Benzoate", /sodium\s+benzoate/i, "A preservative that may form benzene (a carcinogen) when combined with vitamin C."],
  ["Red 40", /red\s*(no\.?\s*)?40|allura\s+red/i, "A petroleum-based artificial dye linked to hyperactivity in children."],
  ["Yellow 5", /yellow\s*(no\.?\s*)?5|tartrazine/i, "A synthetic dye associated with allergic reactions and hyperactivity."],
  ["Yellow 6", /yellow\s*(no\.?\s*)?6|sunset\s+yellow/i, "A petroleum-derived dye linked to hyperactivity and allergic reactions."],
  ["Blue 1", /blue\s*(no\.?\s*)?1|brilliant\s+blue/i, "A synthetic dye with limited safety data on long-term consumption."],
  ["Carrageenan", /carrageenan/i, "A thickener linked to gastrointestinal inflammation and digestive issues."],
  ["Sodium Nitrite", /sodium\s+nitrite/i, "A preservative that may form cancer-linked nitrosamines during cooking."],
  ["Potassium Bromate", /potassium\s+bromate/i, "A flour improver classified as a possible carcinogen, banned in many countries."],
];

/**
 * Find the surrounding text on the label for a matched ingredient.
 * Returns the clause or comma-separated segment containing the match.
 */
function extractLabelContext(raw: string, pattern: RegExp): string {
  const match = raw.match(pattern);
  if (!match || match.index === undefined) return match?.[0] ?? "";

  // Try to grab the comma/parenthesis-delimited segment
  const start = Math.max(0, raw.lastIndexOf(",", match.index) + 1);
  let end = raw.indexOf(",", match.index + match[0].length);
  if (end === -1) end = raw.length;

  return raw.slice(start, end).trim().replace(/^[\s,]+|[\s,]+$/g, "");
}

export function analyzeIngredients(rawText: string): { score: number; flagged: FlaggedIngredient[] } {
  const flagged: FlaggedIngredient[] = [];

  for (const [name, pattern, reason] of FLAGGED_PATTERNS) {
    if (pattern.test(rawText)) {
      flagged.push({
        name,
        reason,
        labelText: extractLabelContext(rawText, pattern),
      });
    }
  }

  // Score: start at 100, deduct per flag (diminishing), floor at 5
  let score = 100;
  for (let i = 0; i < flagged.length; i++) {
    score -= Math.max(5, 18 - i * 2);
  }
  score = Math.max(5, Math.min(100, score));

  return { score, flagged };
}

export async function fetchProduct(barcode: string): Promise<ProductResult | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const name = product.product_name || "Unknown Product";
  const brand = product.brands || "Unknown Brand";
  const ingredientsRaw = product.ingredients_text || "";

  const { score, flagged } = analyzeIngredients(ingredientsRaw);

  return { name, brand, score, ingredientsRaw, flagged };
}
