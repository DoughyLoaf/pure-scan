import type { ProductResult } from "./scoring";

const STORAGE_KEY = "pure_scan_history";
const MAX_HISTORY = 20;

export interface ScanHistoryEntry {
  product: ProductResult;
  scannedAt: string; // ISO string
}

export function getScanHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addScanToHistory(product: ProductResult): void {
  const history = getScanHistory();
  // Avoid duplicates by name — replace if exists
  const filtered = history.filter((e) => e.product.name !== product.name);
  filtered.unshift({ product, scannedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}
