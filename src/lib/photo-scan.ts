import { supabase } from "@/integrations/supabase/client";
import { analyzeIngredients } from "./scoring";
import { getSessionId } from "./session";
import type { ProductResult } from "./scoring";

/* ─── Types ─── */
export interface PhotoScanResult {
  product: ProductResult;
  confidence: "high" | "medium" | "low";
  needsConfirmation: boolean;
  extractedText: string;
  fromCache: boolean;
  compressionRatio: number;
  rawResponse?: any;
}

/* ─── Cost Tracking (localStorage counters) ─── */
const COUNTER_KEYS = {
  calls: "pure_ai_calls_total",
  cacheHits: "pure_ai_cache_hits",
  tokensSaved: "pure_ai_tokens_saved",
} as const;

function incrementCounter(key: string, amount = 1) {
  try {
    const v = parseInt(localStorage.getItem(key) || "0", 10);
    localStorage.setItem(key, String(v + amount));
  } catch {}
}

export function getAICostMetrics() {
  try {
    const calls = parseInt(localStorage.getItem(COUNTER_KEYS.calls) || "0", 10);
    const hits = parseInt(localStorage.getItem(COUNTER_KEYS.cacheHits) || "0", 10);
    const tokensSaved = parseInt(localStorage.getItem(COUNTER_KEYS.tokensSaved) || "0", 10);
    const total = calls + hits;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "0.0";
    // Rough estimate: ~$0.003 per 1K input tokens for flash model
    const costSaved = ((tokensSaved / 1000) * 0.003).toFixed(2);
    return { calls, cacheHits: hits, tokensSaved, hitRate, costSaved, total };
  } catch {
    return { calls: 0, cacheHits: 0, tokensSaved: 0, hitRate: "0.0", costSaved: "0.00", total: 0 };
  }
}

/* ─── LAYER 1: Product cache check ─── */
const CACHE_PREFIX = "pure_product_";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function checkLocalCache(name: string, brand: string): ProductResult | null {
  try {
    // Check all cached products by iterating localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) continue;
      if (
        data.name?.toLowerCase() === name.toLowerCase() &&
        data.brand?.toLowerCase() === brand.toLowerCase() &&
        data.ingredientsRaw
      ) {
        return data as ProductResult;
      }
    }
  } catch {}
  return null;
}

async function checkSupabaseCache(name: string, brand: string): Promise<ProductResult | null> {
  try {
    const { data } = await supabase
      .from("products")
      .select("*")
      .ilike("product_name", name)
      .ilike("brand", brand)
      .not("ingredients_raw", "is", null)
      .limit(1)
      .single();

    if (!data || !data.ingredients_raw) return null;

    const { score, flagged } = analyzeIngredients(data.ingredients_raw);
    return {
      name: data.product_name,
      brand: data.brand || "Unknown Brand",
      score,
      ingredientsRaw: data.ingredients_raw,
      flagged,
      categoriesRaw: data.categories_raw || "",
      imageUrl: data.image_url || undefined,
    };
  } catch {
    return null;
  }
}

/* ─── LAYER 2: Image compression ─── */
export function compressImageForAI(base64: string): Promise<{ compressed: string; ratio: number; originalBytes: number; compressedBytes: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 800;
      let w = img.width;
      let h = img.height;
      if (w > h && w > MAX_DIM) {
        h = Math.round(h * (MAX_DIM / w));
        w = MAX_DIM;
      } else if (h > MAX_DIM) {
        w = Math.round(w * (MAX_DIM / h));
        h = MAX_DIM;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.82);

      const originalBytes = Math.round((base64.length - (base64.indexOf(",") + 1)) * 0.75);
      const compressedBytes = Math.round((compressed.length - (compressed.indexOf(",") + 1)) * 0.75);
      const ratio = originalBytes > 0 ? compressedBytes / originalBytes : 1;

      if (import.meta.env.DEV) {
        console.log(`[Pure] Image compression: ${(originalBytes / 1024).toFixed(0)}KB → ${(compressedBytes / 1024).toFixed(0)}KB (${(ratio * 100).toFixed(0)}%)`);
      }

      resolve({ compressed, ratio, originalBytes, compressedBytes });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = base64;
  });
}

/* ─── LAYER 5: Background enrichment queue (fire & forget) ─── */
function enqueueForEnrichment(data: any, imageBytes: number) {
  try {
    supabase
      .from("enrichment_queue" as any)
      .insert({
        session_id: getSessionId(),
        product_name: data.product_name || null,
        brand: data.brand || data.brand_name || null,
        barcode: data.barcode || null,
        ingredient_text_raw: data.ingredient_text_raw || data.ingredients_raw || null,
        confidence: data.confidence || "unknown",
        image_size_bytes: imageBytes,
        processing_status: "pending",
      })
      .then(() => {});
  } catch {}
}

/* ─── MAIN: processPhotoScan ─── */
export async function processPhotoScan(
  base64Image: string,
  onProgress?: (step: string) => void
): Promise<PhotoScanResult> {
  // LAYER 2: Compress image
  onProgress?.("Compressing image…");
  const { compressed, ratio, originalBytes, compressedBytes } = await compressImageForAI(base64Image);

  // Track token savings from compression
  const tokensSaved = Math.max(0, Math.round(originalBytes / 1000 - compressedBytes / 1000));
  incrementCounter(COUNTER_KEYS.tokensSaved, tokensSaved);

  // LAYER 3+: Call AI
  onProgress?.("Reading ingredients…");
  incrementCounter(COUNTER_KEYS.calls);

  const { data, error: fnError } = await supabase.functions.invoke("extract-ingredients", {
    body: { images: [compressed] },
  });

  if (fnError || !data) throw new Error(fnError?.message || "Failed to process image");

  if (data.error === "no_label_visible") {
    throw new Error("no_label_visible");
  }

  const confidence: "high" | "medium" | "low" = data.confidence || "medium";
  const ingredientsRaw = data.ingredients_raw || data.ingredient_text_raw || "";
  const isWater = data.is_water === true;

  // LAYER 1: Post-extraction cache check — does this product already exist?
  const productName = data.product_name || "Photo Scanned Product";
  const brandName = data.brand || data.brand_name || "Unknown Brand";

  if (confidence === "high" && productName !== "Photo Scanned Product") {
    onProgress?.("Checking database…");
    const localCached = checkLocalCache(productName, brandName);
    if (localCached) {
      incrementCounter(COUNTER_KEYS.cacheHits);
      // Decrement the AI call we just made since we're using cache
      // (We still made the call, but future calls for same product won't)
      enqueueForEnrichment(data, compressedBytes);
      return {
        product: localCached,
        confidence: "high",
        needsConfirmation: false,
        extractedText: localCached.ingredientsRaw,
        fromCache: true,
        compressionRatio: ratio,
        rawResponse: data,
      };
    }

    const dbCached = await checkSupabaseCache(productName, brandName);
    if (dbCached) {
      incrementCounter(COUNTER_KEYS.cacheHits);
      enqueueForEnrichment(data, compressedBytes);
      return {
        product: dbCached,
        confidence: "high",
        needsConfirmation: false,
        extractedText: dbCached.ingredientsRaw,
        fromCache: true,
        compressionRatio: ratio,
        rawResponse: data,
      };
    }
  }

  // No cache hit — build product from AI extraction
  if (!ingredientsRaw.trim() && !isWater) {
    // LAYER 3: low confidence handling for no-ingredient products
    if (confidence === "low") {
      // Store low-confidence for manual review
      try {
        supabase.from("product_submissions").insert({
          session_id: getSessionId(),
          barcode: data.barcode || "PHOTO_SCAN_" + Date.now(),
          product_name: productName,
          brand: brandName,
          ingredients_raw: ingredientsRaw || null,
          status: "low_confidence",
          notes: JSON.stringify({ confidence, source: "photo_scan" }),
        } as any).then(() => {});
      } catch {}
    }
    throw new Error("no_ingredients");
  }

  const { score, flagged } = ingredientsRaw.trim()
    ? analyzeIngredients(ingredientsRaw)
    : { score: 100, flagged: [] };

  const product: ProductResult = {
    name: productName,
    brand: brandName,
    score,
    ingredientsRaw,
    flagged,
    categoriesRaw: data.category || "",
  };

  // LAYER 5: Background enrichment (non-blocking)
  enqueueForEnrichment(data, compressedBytes);

  // LAYER 3: Determine if user confirmation is needed
  const needsConfirmation = confidence === "medium";

  return {
    product,
    confidence,
    needsConfirmation,
    extractedText: ingredientsRaw,
    fromCache: false,
    compressionRatio: ratio,
    rawResponse: data,
  };
}

/* ─── LAYER 4: User correction helper ─── */
export function submitUserCorrection(
  originalProduct: ProductResult,
  correctedIngredients: string,
  rawResponse: any
): ProductResult {
  const { score, flagged } = analyzeIngredients(correctedIngredients);
  const corrected: ProductResult = {
    ...originalProduct,
    score,
    ingredientsRaw: correctedIngredients,
    flagged,
  };

  // Store both AI extraction + user correction in product_submissions
  try {
    supabase.from("product_submissions").insert({
      session_id: getSessionId(),
      barcode: rawResponse?.barcode || "PHOTO_CORRECTED_" + Date.now(),
      product_name: corrected.name,
      brand: corrected.brand,
      ingredients_raw: correctedIngredients,
      status: "user_corrected",
      notes: JSON.stringify({
        source: "photo_scan",
        user_corrected: true,
        original_ai_text: rawResponse?.ingredient_text_raw || rawResponse?.ingredients_raw || "",
        confidence: rawResponse?.confidence,
      }),
    } as any).then(() => {});
  } catch {}

  // Upsert as manually verified in products table if barcode available
  if (rawResponse?.barcode) {
    try {
      (supabase as any).rpc("upsert_product", {
        p_barcode: rawResponse.barcode,
        p_product_name: corrected.name,
        p_brand: corrected.brand,
        p_pure_score: corrected.score,
        p_ingredients_raw: correctedIngredients,
        p_flagged_count: corrected.flagged.length,
        p_flagged_categories: [...new Set(corrected.flagged.map(f => f.category))],
        p_flagged_ingredients: corrected.flagged.map(f => f.name),
        p_categories_raw: rawResponse?.category || "",
        p_image_url: null,
        p_is_water: rawResponse?.is_water || false,
        p_water_brand: null,
      }).then(() => {});
    } catch {}
  }

  return corrected;
}
