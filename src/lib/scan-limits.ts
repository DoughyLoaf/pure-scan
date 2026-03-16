const SCAN_COUNT_KEY = "pure_daily_scans";
const SCAN_DATE_KEY = "pure_scan_date";
const PRO_KEY = "pure_is_pro";
const FREE_DAILY_LIMIT = 5;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyScansUsed(): number {
  const savedDate = localStorage.getItem(SCAN_DATE_KEY);
  if (savedDate !== getTodayStr()) return 0;
  return parseInt(localStorage.getItem(SCAN_COUNT_KEY) || "0", 10);
}

export function getScansRemaining(): number {
  if (isPro()) return Infinity;
  return Math.max(0, FREE_DAILY_LIMIT - getDailyScansUsed());
}

export function recordScan(): { remaining: number; blocked: boolean } {
  if (isPro()) return { remaining: Infinity, blocked: false };

  const today = getTodayStr();
  const savedDate = localStorage.getItem(SCAN_DATE_KEY);
  let count = 0;

  if (savedDate === today) {
    count = parseInt(localStorage.getItem(SCAN_COUNT_KEY) || "0", 10);
  } else {
    localStorage.setItem(SCAN_DATE_KEY, today);
    localStorage.setItem(SCAN_COUNT_KEY, "0");
  }

  count += 1;
  localStorage.setItem(SCAN_COUNT_KEY, count.toString());

  const remaining = Math.max(0, FREE_DAILY_LIMIT - count);
  return { remaining, blocked: count > FREE_DAILY_LIMIT };
}

export function canScan(): boolean {
  if (isPro()) return true;
  return getDailyScansUsed() < FREE_DAILY_LIMIT;
}

export function isPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setPro(value: boolean): void {
  localStorage.setItem(PRO_KEY, value ? "true" : "false");
}

export const FREE_DAILY_LIMIT_VALUE = FREE_DAILY_LIMIT;
