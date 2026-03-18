import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, ChevronDown, X, ScanLine, Camera, ChevronRight } from "lucide-react";
import { isPro, getScansRemaining, FREE_DAILY_LIMIT_VALUE } from "@/lib/scan-limits";
import type { ProductResult, FlaggedIngredient } from "@/lib/scoring";
import { getAlternatives, inferCategory, type AlternativeProduct } from "@/lib/alternatives-database";
import { trackAlternativeTap } from "@/lib/track";
import ResultSkeleton from "@/components/ResultSkeleton";
import { toast } from "@/hooks/use-toast";

// ── Demo data ──────────────────────────────────────────────────────
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

// ── Tier system ────────────────────────────────────────────────────
type Tier = { label: string; color: string; bgLight: string };

const getTier = (score: number): Tier => {
  if (score >= 85) return { label: "PURE", color: "hsl(157, 70%, 37%)", bgLight: "hsl(157, 70%, 95%)" };
  if (score >= 75) return { label: "CLEAN", color: "hsl(157, 70%, 37%)", bgLight: "hsl(157, 70%, 95%)" };
  if (score >= 50) return { label: "MIXED", color: "hsl(38, 92%, 50%)", bgLight: "hsl(38, 92%, 95%)" };
  return { label: "AVOID", color: "hsl(0, 72%, 51%)", bgLight: "hsl(0, 72%, 96%)" };
};

// ── Ingredient dot color ───────────────────────────────────────────
const ingredientDotColor = (category: string): { dot: string; level: "red" | "yellow" | "green" } => {
  switch (category) {
    case "Seed Oil":
    case "Artificial Sweetener":
    case "Artificial Dye":
      return { dot: "hsl(0, 72%, 51%)", level: "red" };
    case "Preservative":
    case "Added Sugar":
    case "Emulsifier":
      return { dot: "hsl(38, 92%, 50%)", level: "yellow" };
    default:
      return { dot: "hsl(38, 92%, 50%)", level: "yellow" };
  }
};

// ── Verdict generator ──────────────────────────────────────────────
const getVerdict = (data: ProductResult): string => {
  const redCount = data.flagged.filter(f => {
    const { level } = ingredientDotColor(f.category);
    return level === "red";
  }).length;
  const totalFlagged = data.flagged.length;

  if (data.score >= 85 && totalFlagged === 0) {
    return "This is one of the cleanest options in its category.";
  }
  if (data.score >= 75 && totalFlagged <= 1) {
    return "A solid choice with minimal concerns — you're in good shape.";
  }
  if (redCount >= 3) {
    return `This product contains ${redCount} red-flag ingredients we recommend avoiding.`;
  }
  if (redCount >= 1 && totalFlagged >= 3) {
    return `${redCount} ingredient${redCount > 1 ? "s" : ""} we'd avoid plus ${totalFlagged - redCount} worth watching — consider a swap.`;
  }
  if (data.score < 40) {
    return "We'd skip this one — there are much cleaner options available.";
  }
  if (totalFlagged >= 2) {
    return `${totalFlagged} flagged ingredients — not the worst, but cleaner options exist.`;
  }
  if (totalFlagged === 1) {
    return `One ingredient to watch: ${data.flagged[0].name}. Otherwise, not bad.`;
  }
  return "No major red flags detected in this product.";
};

// ── Score Ring ──────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
  const tier = getTier(score);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 136 136">
          <circle cx="68" cy="68" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="68" cy="68" r={radius} fill="none"
            stroke={tier.color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold leading-none" style={{ fontFamily: "var(--font-display)", color: tier.color }}>
            {score}
          </span>
        </div>
      </div>
      <span
        className="mt-2 rounded-full px-4 py-1 text-[11px] font-extrabold tracking-[0.2em]"
        style={{ backgroundColor: tier.bgLight, color: tier.color }}
      >
        {tier.label}
      </span>
    </div>
  );
};

// ── Ingredient Row ─────────────────────────────────────────────────
const IngredientRow = ({ ingredient }: { ingredient: FlaggedIngredient }) => {
  const [expanded, setExpanded] = useState(false);
  const { dot, level } = ingredientDotColor(ingredient.category);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left"
    >
      <div className="flex items-center gap-3 py-3">
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {ingredient.name}
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
          {ingredient.category}
        </span>
        <ChevronDown
          size={16} strokeWidth={2}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: expanded ? "200px" : "0px", opacity: expanded ? 1 : 0 }}
      >
        <div className="pb-3 pl-[22px]">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {level === "red" && (
              <><strong className="text-foreground">{ingredient.name}</strong> — {ingredient.reason.charAt(0).toLowerCase() + ingredient.reason.slice(1)}</>
            )}
            {level === "yellow" && (
              <><strong className="text-foreground">{ingredient.name}</strong> — use caution. {ingredient.reason}</>
            )}
          </p>
        </div>
      </div>
    </button>
  );
};

// ── Clean ingredients (green) ──────────────────────────────────────
const parseCleanIngredients = (raw: string, flaggedNames: Set<string>): string[] => {
  if (!raw.trim()) return [];
  const all = raw.split(/,|;/).map(s => s.trim().replace(/\(.*?\)/g, "").trim()).filter(Boolean);
  return all.filter(name => {
    const lower = name.toLowerCase();
    for (const flagged of flaggedNames) {
      if (lower.includes(flagged.toLowerCase()) || flagged.toLowerCase().includes(lower)) return false;
    }
    return true;
  }).slice(0, 12);
};

// ── Mini Alternative Card ──────────────────────────────────────────
const MiniAltCard = ({ alt, scannedName, scannedScore }: { alt: AlternativeProduct; scannedName: string; scannedScore: number }) => {
  const navigate = useNavigate();
  const tier = getTier(alt.score);

  return (
    <button
      onClick={() => {
        trackAlternativeTap(scannedName, scannedScore, alt, "view");
        const query = encodeURIComponent(`${alt.name} ${alt.brand} near me`);
        window.open(`https://www.google.com/maps/search/${query}`, "_blank");
      }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors active:bg-muted/50 w-full"
    >
      {/* Score */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tier.bgLight }}
      >
        <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: tier.color }}>
          {alt.score}
        </span>
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {alt.brand}
        </p>
        <p className="text-[14px] font-semibold leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
          {alt.name}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </button>
  );
};

// ── Main Result Component ──────────────────────────────────────────
const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [ready, setReady] = useState(false);
  const [scansRemaining, setScansRemaining] = useState<number>(FREE_DAILY_LIMIT_VALUE);
  const [showGreen, setShowGreen] = useState(false);

  const locationState = location.state as { product?: ProductResult; fromPhotoScan?: boolean } | null;
  const data = locationState?.product ?? DEMO_DATA;
  const fromPhotoScan = locationState?.fromPhotoScan === true;

  const tier = getTier(data.score);
  const verdict = getVerdict(data);
  const flaggedNames = new Set(data.flagged.map(f => f.name));
  const cleanIngredients = parseCleanIngredients(data.ingredientsRaw, flaggedNames);
  const alternatives = getAlternatives(data).slice(0, 3);

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
            const shareText = `${data.name} scored ${data.score}/100 on Pure. ${verdict}`;
            const shareData = { title: `Pure Score — ${data.name}`, text: shareText, url: "https://getpure.app" };
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

      {/* Product name + brand */}
      <div className="mt-6 px-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {data.brand}
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          {data.name}
        </h1>
      </div>

      {/* Score */}
      <div className="mt-6 flex justify-center">
        <ScoreRing score={data.score} />
      </div>

      {/* Verdict */}
      <p className="mt-5 px-8 text-center text-[15px] leading-relaxed text-muted-foreground">
        {verdict}
      </p>

      {/* Photo scan attribution */}
      {fromPhotoScan && (
        <div className="mx-6 mt-4 flex items-center justify-center gap-2 rounded-xl py-2 text-[13px] text-muted-foreground"
          style={{ backgroundColor: tier.bgLight }}>
          <Camera size={14} strokeWidth={2} style={{ color: tier.color }} />
          <span>Score based on your photo scan — thanks for adding this to Pure!</span>
        </div>
      )}

      {/* Divider */}
      <div className="mx-6 mt-8 h-px bg-border" />

      {/* Ingredient breakdown */}
      <div className="mt-6 px-6">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Ingredients
        </h2>

        {/* Flagged ingredients */}
        {data.flagged.length > 0 && (
          <div className="mt-3 divide-y divide-border">
            {data.flagged.map((ing) => (
              <IngredientRow key={ing.name} ingredient={ing} />
            ))}
          </div>
        )}

        {/* Clean ingredients (collapsed) */}
        {cleanIngredients.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowGreen(!showGreen)}
              className="flex items-center gap-2 py-2 text-[13px] font-medium text-muted-foreground"
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
              {cleanIngredients.length} clean ingredient{cleanIngredients.length !== 1 ? "s" : ""}
              <ChevronDown
                size={14} strokeWidth={2}
                className={`transition-transform duration-200 ${showGreen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{ maxHeight: showGreen ? "300px" : "0px", opacity: showGreen ? 1 : 0 }}
            >
              <div className="flex flex-wrap gap-1.5 pb-2 pl-[22px]">
                {cleanIngredients.map((name) => (
                  <span key={name} className="rounded-full bg-accent px-2.5 py-1 text-[12px] text-accent-foreground">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {data.flagged.length === 0 && cleanIngredients.length === 0 && data.ingredientsRaw.trim() === "" && (
          <p className="mt-3 text-[14px] text-muted-foreground">
            No ingredient data available yet for this product.
          </p>
        )}
      </div>

      {/* Cleaner options */}
      {alternatives.length > 0 && (
        <>
          <div className="mx-6 mt-8 h-px bg-border" />
          <div className="mt-6 px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Cleaner options
              </h2>
              <button
                onClick={() => navigate("/alternatives", { state: { product: data } })}
                className="text-[12px] font-semibold text-primary"
              >
                See all →
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {alternatives.map((alt) => (
                <MiniAltCard key={alt.name} alt={alt} scannedName={data.name} scannedScore={data.score} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+68px)] pt-4">
        <button
          onClick={() => navigate("/scanner")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
        >
          <ScanLine size={18} strokeWidth={2} />
          Scan another
        </button>
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
