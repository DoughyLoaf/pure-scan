import { supabase } from "@/integrations/supabase/client";
import { getSessionId, getPlatform, getAppVersion } from "./session";
import type { ProductResult } from "./scoring";

/** Record a successful product scan — fire & forget */
export function trackScan(product: ProductResult, barcode?: string, isWater = false, waterBrand?: string, scanMethod: 'barcode' | 'photo' | 'manual' = 'barcode'): void {
  if (import.meta.env.DEV) console.log('[Pure] trackScan fired:', product.name, 'method:', scanMethod);
  try {
    const flaggedCategories = [...new Set(product.flagged.map((f) => f.category))];
    const flaggedIngredients = product.flagged.map((f) => f.name);

    supabase
      .from("scans")
      .insert({
        session_id: getSessionId(),
        barcode: barcode || null,
        product_name: product.name,
        brand: product.brand,
        pure_score: product.score,
        categories_raw: product.categoriesRaw || null,
        ingredients_raw: product.ingredientsRaw,
        flagged_count: product.flagged.length,
        flagged_categories: flaggedCategories,
        flagged_ingredients: flaggedIngredients,
        is_water: isWater,
        water_brand: waterBrand || null,
        app_version: getAppVersion(),
        platform: getPlatform(),
        scan_method: scanMethod,
      } as any)
      .then(() => {});

    // Atomic session counter increment
    (supabase as any).rpc("increment_session_scan", {
      p_session_id: getSessionId(),
      p_flagged_count: product.flagged.length,
    }).then(() => {});

    // Upsert into products master table
    if (barcode) {
      (supabase as any).rpc("upsert_product", {
        p_barcode: barcode,
        p_product_name: product.name,
        p_brand: product.brand,
        p_pure_score: product.score,
        p_ingredients_raw: product.ingredientsRaw,
        p_flagged_count: product.flagged.length,
        p_flagged_categories: flaggedCategories,
        p_flagged_ingredients: flaggedIngredients,
        p_categories_raw: product.categoriesRaw || null,
        p_image_url: (product as any).imageUrl || null,
        p_is_water: isWater,
        p_water_brand: waterBrand || null,
      }).then(() => {});
    }

    // Update brand stats
    if (product.brand && product.brand !== "Unknown Brand") {
      (supabase as any).rpc("update_brand_stats", {
        p_brand: product.brand,
        p_score: product.score,
        p_flag: flaggedCategories[0] || null,
      }).then(() => {});
    }

    // Increment each flagged ingredient
    for (const flag of product.flagged) {
      (supabase as any).rpc("increment_ingredient", {
        p_name: flag.name,
        p_category: flag.category,
      }).then(() => {});
    }
  } catch {
    // Never affect UX
  }
}

/** Record an unknown barcode — fire & forget */
export function trackUnknownBarcode(barcode: string): void {
  try {
    supabase
      .from("unknown_barcodes")
      .upsert(
        {
          barcode,
          scan_count: 1,
          last_scanned_at: new Date().toISOString(),
        },
        { onConflict: "barcode" }
      )
      .then(() => {});
  } catch {
    // Never affect UX
  }
}

/** Record an alternative tap — fire & forget */
export function trackAlternativeTap(
  scannedProductName: string,
  scannedProductScore: number,
  alt: { name: string; brand: string; score: number },
  action: "find_near_me" | "view"
): void {
  try {
    supabase
      .from("alternative_taps")
      .insert({
        session_id: getSessionId(),
        scanned_product_name: scannedProductName,
        scanned_product_score: scannedProductScore,
        alternative_name: alt.name,
        alternative_brand: alt.brand,
        alternative_score: alt.score,
        action,
      })
      .then(() => {});
  } catch {
    // Never affect UX
  }
}
