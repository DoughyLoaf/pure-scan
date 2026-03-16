import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordScan, getDailyScansUsed, canScan, getScansRemaining } from "../lib/scan-limits";

describe("scan-limits daily reset", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resets count when a new day starts", () => {
    // Simulate scans on "old" day
    const oldDate = "2026-03-15";
    const newDate = "2026-03-16";

    localStorage.setItem("pure_scan_date", oldDate);
    localStorage.setItem("pure_daily_scans", "4");

    // Mock Date to return new day
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${newDate}T12:00:00Z`));

    const result = recordScan();
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(4); // 5 limit - 1 scan = 4
    expect(getDailyScansUsed()).toBe(1);
    expect(localStorage.getItem("pure_scan_date")).toBe(newDate);

    vi.useRealTimers();
  });

  it("accumulates scans within the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));

    recordScan();
    recordScan();
    recordScan();
    expect(getDailyScansUsed()).toBe(3);
    expect(canScan()).toBe(true);
    expect(getScansRemaining()).toBe(2);

    vi.useRealTimers();
  });

  it("blocks after exceeding daily limit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));

    for (let i = 0; i < 5; i++) recordScan();
    expect(canScan()).toBe(false);
    expect(getScansRemaining()).toBe(0);

    const result = recordScan();
    expect(result.blocked).toBe(true);

    vi.useRealTimers();
  });
});
