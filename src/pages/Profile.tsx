import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getScanHistory } from "@/lib/scan-history";
import { getDailyScansUsed, isPro, FREE_DAILY_LIMIT_VALUE } from "@/lib/scan-limits";
import { ChevronRight, Clock, Crown, Leaf, Shield, Trash2 } from "lucide-react";
import type { ScanHistoryEntry } from "@/lib/scan-history";

const DIETARY_OPTIONS = [
  { id: "seed-oils", label: "Avoid seed oils", icon: "🛢️" },
  { id: "artificial-dyes", label: "Avoid artificial dyes", icon: "🎨" },
  { id: "artificial-sweeteners", label: "Avoid artificial sweeteners", icon: "🧪" },
  { id: "preservatives", label: "Avoid preservatives", icon: "🧂" },
  { id: "gluten", label: "Avoid gluten", icon: "🌾" },
  { id: "dairy", label: "Avoid dairy", icon: "🥛" },
];

const PREFS_KEY = "pure_dietary_prefs";

function loadPrefs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePrefs(prefs: string[]) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const scoreColor = (score: number) => {
  if (score < 40) return "hsl(0, 72%, 51%)";
  if (score < 75) return "hsl(38, 92%, 50%)";
  return "hsl(var(--primary))";
};

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const HistoryItem = ({ entry }: { entry: ScanHistoryEntry }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/result", { state: { product: entry.product } })}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors active:bg-muted"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: scoreColor(entry.product.score),
          backgroundColor: scoreColor(entry.product.score) + "14",
        }}
      >
        {entry.product.score}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-[13px] font-semibold">{entry.product.name}</p>
        <p className="text-[11px] text-muted-foreground">{getRelativeTime(entry.scannedAt)}</p>
      </div>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </button>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const history = getScanHistory();
  const [prefs, setPrefs] = useState<string[]>(loadPrefs);
  const pro = isPro();
  const scansUsed = getDailyScansUsed();
  const scansRemaining = pro ? "∞" : FREE_DAILY_LIMIT_VALUE - scansUsed;

  const togglePref = (id: string) => {
    const next = prefs.includes(id) ? prefs.filter((p) => p !== id) : [...prefs, id];
    setPrefs(next);
    savePrefs(next);
  };

  const clearHistory = () => {
    localStorage.removeItem("pure_scan_history");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-14">
        {/* Header */}
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Profile
        </h1>

        {/* Plan Card */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              {pro ? (
                <Crown size={20} className="text-primary" strokeWidth={1.8} />
              ) : (
                <Shield size={20} className="text-primary" strokeWidth={1.8} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {pro ? "Pure Pro" : "Pure Free"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {pro ? "Unlimited scans" : `${scansRemaining} scans left today`}
              </p>
            </div>
            {!pro && (
              <button
                onClick={() => navigate("/paywall")}
                className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground active:opacity-90"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Leaf size={16} className="text-primary" strokeWidth={2} />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dietary Preferences
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_OPTIONS.map((opt) => {
              const active = prefs.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => togglePref(opt.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-accent text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scan History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" strokeWidth={2} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Scan History
              </h2>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-[12px] text-muted-foreground active:text-destructive"
              >
                <Trash2 size={12} strokeWidth={2} />
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-8">
              <p className="text-sm text-muted-foreground">No scan history yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.slice(0, 10).map((entry, i) => (
                <HistoryItem key={`${entry.product.name}-${i}`} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h2>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card overflow-hidden">
            <button className="flex items-center justify-between px-4 py-3 text-left text-sm transition-colors active:bg-muted">
              <span>Notifications</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <div className="mx-4 border-t border-border" />
            <button className="flex items-center justify-between px-4 py-3 text-left text-sm transition-colors active:bg-muted">
              <span>Privacy Policy</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <div className="mx-4 border-t border-border" />
            <button className="flex items-center justify-between px-4 py-3 text-left text-sm transition-colors active:bg-muted">
              <span>Terms of Service</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* App info */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Pure v1.0 · Made with care for your health
        </p>
      </div>
    </div>
  );
};

export default Profile;
