import { ScanLine, Clock, ChevronRight, Flame, ShieldCheck, AlertTriangle, FlaskConical, TrendingUp, TrendingDown, Minus, Candy, Droplets, Palette } from "lucide-react";
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

function getWeekScans(history: ScanHistoryEntry[], weeksAgo: number) {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay() - weeksAgo * 7);
  startOfThisWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfThisWeek);
  endOfWeek.setDate(startOfThisWeek.getDate() + 7);
  return history.filter((e) => {
    const d = new Date(e.scannedAt);
    return d >= startOfThisWeek && d < endOfWeek;
  });
}

const SEED_OIL_CAT = "Seed Oil";
const ADDITIVE_CATS = new Set(["Artificial Dye", "Artificial Sweetener", "Preservative"]);

const WeeklySummary = ({ history }: { history: ScanHistoryEntry[] }) => {
  const { seedOilCount, additiveCount, sugarCount, emulsifierCount, dyeCount, avgScore, trend } = useMemo(() => {
    const thisWeek = getWeekScans(history, 0);
    const lastWeek = getWeekScans(history, 1);

    let oils = 0;
    let additives = 0;
    let sugars = 0;
    let emulsifiers = 0;
    let dyes = 0;
    let scoreSum = 0;
    thisWeek.forEach((e) => {
      scoreSum += e.product.score;
      e.product.flagged.forEach((f) => {
        if (f.category === SEED_OIL_CAT) oils++;
        if (ADDITIVE_CATS.has(f.category)) additives++;
        if (f.category === "Added Sugar") sugars++;
        if (f.category === "Emulsifier") emulsifiers++;
        if (f.category === "Artificial Dye") dyes++;
      });
    });

    const avg = thisWeek.length > 0 ? Math.round(scoreSum / thisWeek.length) : 0;

    let lastAvg = 0;
    if (lastWeek.length > 0) {
      lastAvg = Math.round(lastWeek.reduce((s, e) => s + e.product.score, 0) / lastWeek.length);
    }

    const t = thisWeek.length === 0 ? "neutral" : avg > lastAvg ? "up" : avg < lastAvg ? "down" : "neutral";
    return { seedOilCount: oils, additiveCount: additives, sugarCount: sugars, emulsifierCount: emulsifiers, dyeCount: dyes, avgScore: avg, trend: t as "up" | "down" | "neutral" };
  }, [history]);

  const avgColor = avgScore < 40 ? "hsl(0, 72%, 51%)" : avgScore < 75 ? "hsl(38, 92%, 50%)" : "hsl(var(--primary))";
  const circumference = 2 * Math.PI * 16;
  const strokeDash = (avgScore / 100) * circumference;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          This week
        </span>
        {trend !== "neutral" && (
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: trend === "up" ? "hsl(var(--primary))" : "hsl(0, 72%, 51%)" }}
          >
            {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend === "up" ? "Better" : "Worse"} than last week
          </span>
        )}
        {trend === "neutral" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Minus size={14} />
            Same as last week
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Seed Oil Exposures */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
            <Flame size={18} className="text-destructive" />
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {seedOilCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Seed oils
          </p>
        </div>

        {/* Artificial Additives */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(38, 92%, 50%, 0.1)" }}>
            <FlaskConical size={18} style={{ color: "hsl(38, 92%, 50%)" }} />
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {additiveCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Additives
          </p>
        </div>

        {/* Added Sugars */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(330, 70%, 50%, 0.1)" }}>
            <Candy size={18} style={{ color: "hsl(330, 70%, 50%)" }} />
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {sugarCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Added sugars
          </p>
        </div>
      </div>
      <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {/* Emulsifiers */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(200, 60%, 50%, 0.1)" }}>
            <Droplets size={18} style={{ color: "hsl(200, 60%, 50%)" }} />
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {emulsifierCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Emulsifiers
          </p>
        </div>

        {/* Artificial Dyes */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(350, 70%, 50%, 0.1)" }}>
            <Palette size={18} style={{ color: "hsl(350, 70%, 50%)" }} />
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {dyeCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Artificial dyes
          </p>
        </div>

        {/* Average Pure Score */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke={avgColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: avgColor }}>
            {avgScore}
          </p>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground leading-tight">
            Avg Score
          </p>
        </div>
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
    <div className="flex min-h-screen flex-col bg-background px-5 sm:px-6 pb-24 pt-8 sm:pt-10">
      {/* Logo */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The honest food scanner.
        </p>
      </div>

      {/* Personalized greeting */}
      <p className="mb-4 text-[13px] text-muted-foreground">
        {(() => {
          const h = new Date().getHours();
          const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
          return totalFlagged > 0
            ? `${greeting}. You've flagged ${totalFlagged} harmful ingredient${totalFlagged === 1 ? "" : "s"} so far.`
            : `${greeting}. Start scanning to build your clean eating profile.`;
        })()}
      </p>

      {/* Hero CTA */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-accent">
          <ScanLine className="text-primary" size={30} strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Scan a product
        </h2>
        <p className="mt-1 mb-5 sm:mb-6 text-center text-sm text-muted-foreground">
          Check ingredients for seed oils, additives &amp; artificial ingredients.
        </p>
        <button
          onClick={() => navigate("/scanner")}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-colors"
        >
          Start Scanning
        </button>
      </div>

      {/* Water Scan CTA */}
      <button
        onClick={() => navigate("/scanner", { state: { waterMode: true } })}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl p-3.5 sm:p-4 text-left transition-colors active:opacity-80"
        style={{
          backgroundColor: "rgba(14, 165, 233, 0.05)",
          border: "0.5px solid rgba(14, 165, 233, 0.3)",
        }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(var(--water) / 0.1)" }}>
          <Droplets size={18} className="text-water" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium" style={{ fontFamily: "var(--font-display)" }}>
            Check your water
          </p>
          <p className="text-[12px] text-muted-foreground">
            Scan any water bottle for a full quality report
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-water" strokeWidth={2} />
      </button>
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

      {/* Weekly Health Summary */}
      {totalScanned > 0 && (
        <div className="mt-4 sm:mt-5">
          <WeeklySummary history={history} />
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
