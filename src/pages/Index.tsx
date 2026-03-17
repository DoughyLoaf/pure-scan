import { ScanLine, Clock, ChevronRight, Flame, ShieldCheck, AlertTriangle, FlaskConical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getScanHistory } from "@/lib/scan-history";
import type { ScanHistoryEntry } from "@/lib/scan-history";
import { useMemo } from "react";
import Onboarding from "@/components/Onboarding";

const scoreColor = (score: number) => {
  if (score < 40) return "hsl(0, 72%, 51%)";
  if (score < 75) return "hsl(38, 92%, 50%)";
  return "hsl(var(--primary))";
};

const HistoryCard = ({ entry }: { entry: ScanHistoryEntry }) => {
  const navigate = useNavigate();
  const { product, scannedAt } = entry;
  const timeAgo = getRelativeTime(scannedAt);

  return (
    <button
      onClick={() => navigate("/result", { state: { product } })}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 text-left transition-colors active:bg-muted"
    >
      <div
        className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: scoreColor(product.score),
          backgroundColor: scoreColor(product.score) + "14",
        }}
      >
        {product.score}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {product.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {product.brand} · {timeAgo}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  );
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

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const StreakTracker = ({ history }: { history: ScanHistoryEntry[] }) => {
  const last7 = useMemo(() => getLast7Days(), []);
  const scanDays = useMemo(() => {
    const set = new Set<string>();
    history.forEach((e) => set.add(e.scannedAt.slice(0, 10)));
    return set;
  }, [history]);

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (scanDays.has(d.toISOString().slice(0, 10))) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [scanDays]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-primary" />
          <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Your streak
          </span>
        </div>
        <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
          {streak} {streak === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="flex justify-between">
        {last7.map((dateStr) => {
          const dayIdx = new Date(dateStr + "T12:00:00").getDay();
          const active = scanDays.has(dateStr);
          return (
            <div key={dateStr} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {active ? "✓" : ""}
              </div>
              <span className="text-[11px] text-muted-foreground">{DAY_LABELS[dayIdx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const history = getScanHistory();
  const onboardingComplete = localStorage.getItem("pure_onboarding_complete") === "true";

  const totalScanned = history.length;
  const totalFlagged = useMemo(
    () => history.reduce((sum, e) => sum + e.product.flagged.length, 0),
    [history]
  );

  if (!onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 sm:px-6 pb-24 pt-12 sm:pt-14">
      {/* Logo */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Know what's in your food.
        </p>
      </div>

      {/* Hero CTA */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-accent">
          <ScanLine className="text-primary" size={26} strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Scan a product
        </h2>
        <p className="mt-1 mb-5 sm:mb-6 text-center text-sm text-muted-foreground">
          Check ingredients for seed oils, additives &amp; artificial ingredients.
        </p>
        <button
          onClick={() => navigate("/scanner")}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
        >
          Start Scanning
        </button>
      </div>

      {/* Stats Row */}
      {totalScanned > 0 && (
        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <ShieldCheck size={18} className="shrink-0 text-primary" />
            <div>
              <p className="text-base sm:text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {totalScanned}
              </p>
              <p className="text-[11px] text-muted-foreground">Products scanned</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <AlertTriangle size={18} className="shrink-0 text-destructive" />
            <div>
              <p className="text-base sm:text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {totalFlagged}
              </p>
              <p className="text-[11px] text-muted-foreground">Ingredients flagged</p>
            </div>
          </div>
        </div>
      )}

      {/* Streak Tracker */}
      {totalScanned > 0 && (
        <div className="mt-4 sm:mt-5">
          <StreakTracker history={history} />
        </div>
      )}

      {/* Recent Scans */}
      <div className="mt-6 sm:mt-8">
        <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Scans
        </h3>
        {history.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-8 sm:py-10">
            <Clock className="mb-3 text-muted-foreground" size={24} strokeWidth={1.6} />
            <p className="text-sm text-muted-foreground">
              No scans yet. Scan your first product above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry, i) => (
              <HistoryCard key={`${entry.product.name}-${i}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
