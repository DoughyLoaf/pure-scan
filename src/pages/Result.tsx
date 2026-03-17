import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, ChevronDown, Info, X, ScanLine, Leaf } from "lucide-react";
import { isPro, getScansRemaining, FREE_DAILY_LIMIT_VALUE } from "@/lib/scan-limits";
import type { ProductResult, FlaggedIngredient } from "@/lib/scoring";
import ResultSkeleton from "@/components/ResultSkeleton";
import { toast } from "@/hooks/use-toast";

const DEMO_DATA: ProductResult = {
  name: "Lay's Classic Chips",
  brand: "Lay's",
  score: 34,
  ingredientsRaw: "Potatoes, Vegetable Oil (Sunflower, Corn, and/or Canola Oil), Salt, Maltodextrin, Natural and Artificial Flavor",
  flagged: [
    { name: "Canola Oil", category: "Seed Oil", deduction: 15, reason: "A processed seed oil high in omega-6 fatty acids, linked to inflammation.", labelText: "Canola Oil" },
    { name: "Soybean Oil", category: "Seed Oil", deduction: 15, reason: "A highly refined seed oil associated with oxidative stress and inflammatory responses.", labelText: "Soybean Oil" },
    { name: "Maltodextrin", category: "Ultra-Processed", deduction: 5, reason: "A highly processed starch that spikes blood sugar faster than table sugar.", labelText: "Maltodextrin" },
    { name: "Artificial Flavor", category: "Ultra-Processed", deduction: 5, reason: "A synthetic chemical blend with undisclosed compounds used to mimic natural taste.", labelText: "Natural and Artificial Flavor" },
  ],
};

const scoreColor = (score: number) => {
  if (score < 40) return { ring: "hsl(0, 72%, 51%)", label: "Poor" };
  if (score < 75) return { ring: "hsl(38, 92%, 50%)", label: "Fair" };
  return { ring: "hsl(var(--primary))", label: "Clean" };
};

const ScoreRing = ({ score }: { score: number }) => {
  const { ring, label } = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-ring-draw"
            style={{
              "--ring-circumference": `${circumference}`,
              "--ring-offset": `${offset}`,
            } as React.CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: ring }}>
            {score}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span
        className="mt-2 rounded-full px-3 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: ring + "18", color: ring }}
      >
        {label}
      </span>
    </div>
  );
};

const PREF_CATEGORY_MAP: Record<string, string> = {
  "seed-oils": "Seed Oil",
  "artificial-dyes": "Artificial Dye",
  "artificial-sweeteners": "Artificial Sweetener",
  "preservatives": "Preservative",
};

const getUserFlaggedCategories = (): Set<string> => {
  try {
    const prefs: string[] = JSON.parse(localStorage.getItem("pure_dietary_prefs") || "[]");
    return new Set(prefs.map((id) => PREF_CATEGORY_MAP[id]).filter(Boolean));
  } catch {
    return new Set();
  }
};

const FlagCard = ({ ingredient, flaggedCategories }: { ingredient: FlaggedIngredient; flaggedCategories: Set<string> }) => {
  const isFlaggedForUser = flaggedCategories.has(ingredient.category);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {ingredient.name}
          </h4>
          <span className="mt-0.5 inline-block text-[11px] font-medium text-muted-foreground">
            {ingredient.category}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {isFlaggedForUser && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Flagged for you
              </span>
            )}
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
              Avoid
            </span>
          </div>
          <span className="text-[11px] font-semibold text-destructive">
            −{ingredient.deduction} pts
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {ingredient.reason}
      </p>
      <div className="mt-3 rounded-lg bg-muted px-3 py-2">
        <p className="font-mono text-[12px] text-muted-foreground">
          {ingredient.labelText}
        </p>
      </div>
    </div>
  );
};

const MethodologySection = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 w-full">
      <button
        onClick={() => setOpen(!open)}
        className="mx-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors active:text-foreground"
      >
        How we score this
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: open ? "300px" : "0px",
          opacity: open ? 1 : 0,
          marginTop: open ? "12px" : "0px",
        }}
      >
        <ul className="space-y-2.5 rounded-2xl border border-border bg-card px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            We flag seed oils: canola, soybean, sunflower, corn, cottonseed.
          </li>
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            We flag artificial additives: dyes, preservatives, sweeteners.
          </li>
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Scores are based purely on ingredients. No brand can pay to improve their rating.
          </li>
        </ul>
      </div>
    </div>
  );
};

const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [ready, setReady] = useState(false);
  const [scansRemaining, setScansRemaining] = useState<number>(FREE_DAILY_LIMIT_VALUE);
  const [flaggedCategories] = useState(() => getUserFlaggedCategories());

  const locationState = location.state as { product?: ProductResult } | null;
  const data = locationState?.product ?? DEMO_DATA;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const remaining = getScansRemaining();
    setScansRemaining(remaining);
    if (!isPro() && remaining < FREE_DAILY_LIMIT_VALUE) {
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!ready) return <ResultSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
        <button
          onClick={async () => {
            const flaggedCount = data.flagged.length;
            const firstName = flaggedCount > 0 ? data.flagged[0].name : "";
            const shareText = `${data.name} scored ${data.score}/100 on Pure. ${flaggedCount} ingredient${flaggedCount === 1 ? "" : "s"} flagged${firstName ? ` including ${firstName}` : ""}. Check what's in your food 👇`;
            const shareData = {
              title: `Pure Score — ${data.name}`,
              text: shareText,
              url: "https://getpure.app",
            };
            if (navigator.share) {
              try { await navigator.share(shareData); } catch {}
            } else {
              try {
                await navigator.clipboard.writeText(`${shareText} https://getpure.app`);
                toast({ title: "Copied to clipboard" });
              } catch {}
            }
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Product Info + Score */}
      <div className="mt-6 flex flex-col items-center px-6">
        <div className="flex items-center gap-4 w-full justify-center">
          {data.imageUrl ? (
            <ProductImage src={data.imageUrl} alt={data.name} />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted">
              <Leaf size={28} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {data.brand}
            </p>
            <h1
              className="mt-1 text-lg font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.name}
            </h1>
          </div>
        </div>
        <div className="mt-6">
          <ScoreRing score={data.score} />
        </div>

        <MethodologySection />
      </div>

      {/* Missing ingredients notice */}
      {data.ingredientsRaw.trim() === "" && (
        <div className="mx-6 mt-6 flex items-start gap-2.5 rounded-2xl border border-border bg-accent/50 px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" strokeWidth={2} />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">No ingredient data available.</span>{" "}
            This product's score may be incomplete. The database doesn't have an ingredient list for this item yet.
          </p>
        </div>
      )}

      <div className="mt-10 px-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Score breakdown
        </h3>
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Starting score</span>
            <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>100</span>
          </div>
          {data.flagged.map((ing) => (
            <div key={ing.name} className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{ing.name}</span>
              <span className="font-semibold text-destructive">−{ing.deduction}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-border pt-3 flex items-center justify-between text-sm">
            <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Pure Score</span>
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)", color: scoreColor(data.score).ring }}>{data.score}</span>
          </div>
        </div>

        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Why this score?
        </h3>
        <div className="flex flex-col gap-3">
          {data.flagged.map((ing) => (
            <FlagCard key={ing.name} ingredient={ing} flaggedCategories={flaggedCategories} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+68px)] pt-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/scanner")}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3.5 text-sm font-semibold text-foreground transition-colors active:bg-muted"
          >
            <ScanLine size={18} strokeWidth={2} />
            Scan another
          </button>
          <button
            onClick={() => navigate("/alternatives", { state: { product: data } })}
            className="flex-1 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
          >
            See clean alternatives
          </button>
        </div>
      </div>

      {/* Remaining scans banner */}
      {showBanner && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+120px)] z-[60] px-4 animate-fade-in">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                You're on Pure Free
              </p>
              <p className="text-[12px] text-muted-foreground">
                {scansRemaining === 0
                  ? "No scans left today"
                  : `${scansRemaining} scan${scansRemaining === 1 ? "" : "s"} left today`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/paywall")}
                className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
              >
                Upgrade
              </button>
              <button onClick={() => setShowBanner(false)} className="text-muted-foreground active:text-foreground">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Result;
