import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Info, ScanLine, Droplets, CheckCircle2, Minus, ChevronRight, PackageOpen } from "lucide-react";
import type { ProductResult } from "@/lib/scoring";
import { WATER_DATABASE } from "@/lib/water-database";
import type { WaterBrand } from "@/lib/water-database";
import { getAlternatives, inferCategory, type AlternativeProduct } from "@/lib/alternatives-database";
import { trackAlternativeTap } from "@/lib/track";

const CATEGORY_EMOJI: Record<string, string> = {
  chips: "🫙", cereal: "🥣", crackers: "🍪", milk: "🥛", juice: "🧃",
  chocolate: "🍫", popcorn: "🍿", noodles: "🍝", "peanut butter": "🥜",
  "salad dressing": "🥗", "cooking oil": "🫙", candy: "🍬", "ice cream": "🧊",
  bread: "🍞", sauce: "🥫", bars: "💪", "energy drinks": "⚡",
  "frozen meals": "🧇", yogurt: "🍦", soda: "🥤", cookies: "🍪",
  pasta: "🍝", snack: "🫙",
};

// ── Components ─────────────────────────────────────────────────────

const scoreColor = (score: number) => {
  if (score >= 75) return "hsl(var(--primary))";
  if (score >= 50) return "hsl(38, 92%, 50%)";
  return "hsl(var(--destructive))";
};

const MiniScore = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
        <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ fontFamily: "var(--font-display)", color }}>
        {score}
      </span>
    </div>
  );
};

const ProductImage = ({ imageUrl, category }: { imageUrl?: string; category: string }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(imageUrl ? "loading" : "error");
  const emoji = CATEGORY_EMOJI[category] || "🫙";

  if (!imageUrl || status === "error") {
    return (
      <div className="flex h-[120px] w-full items-center justify-center rounded-t-2xl bg-muted">
        <span className="text-[40px] select-none">{emoji}</span>
      </div>
    );
  }

  return (
    <div className="relative h-[120px] w-full overflow-hidden rounded-t-2xl bg-muted">
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img src={imageUrl} alt="" className="h-full w-full object-contain p-3" onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} />
    </div>
  );
};

const AlternativeCard = ({ alt, flaggedCategories, category, scannedProductName, scannedProductScore }: { alt: AlternativeProduct; flaggedCategories: string[]; category: string; scannedProductName: string; scannedProductScore: number }) => {
  const fixesTag = flaggedCategories.length > 0 ? flaggedCategories[0] : null;

  const handleFindNearMe = () => {
    trackAlternativeTap(scannedProductName, scannedProductScore, alt, "find_near_me");
    const query = encodeURIComponent(`${alt.name} ${alt.brand} near me`);
    window.open(`https://www.google.com/maps/search/${query}`, "_blank");
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <ProductImage imageUrl={alt.imageUrl} category={category} />
      <div className="border-t border-border p-4">
        <div className="flex gap-3">
          {/* Left column: score ring */}
          <div className="flex items-start pt-1">
            <MiniScore score={alt.score} />
          </div>
          {/* Right column */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {alt.brand}
            </p>
            <h3 className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {alt.name}
            </h3>

            {/* Certifications — max 2 */}
            {alt.certifications.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {alt.certifications.slice(0, 2).map((cert) => (
                  <span key={cert} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {cert}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground line-clamp-2">
              {alt.reason}
            </p>

            {/* Key ingredients */}
            {alt.keyIngredients.length > 0 && (
              <p className="mt-1 text-[10px] italic text-muted-foreground">
                Made with: {alt.keyIngredients.slice(0, 3).join(", ")}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {fixesTag && (
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    No {fixesTag}
                  </span>
                )}
              </div>
              <button onClick={handleFindNearMe} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors" type="button">
                Find near me →
              </button>
            </div>

            {/* Where to find */}
            {alt.whereToFind.length > 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Found at: {alt.whereToFind.slice(0, 3).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Water Comparison ───────────────────────────────────────────────
const WATER_COMPARE_KEYS = ["icelandic glacial", "waiakea", "fiji", "evian", "liquid death"] as const;

const phDotColor = (ph: number) => {
  if (ph < 6.5) return "hsl(38, 92%, 50%)";
  if (ph > 7.5) return "hsl(var(--water))";
  return "hsl(var(--muted-foreground))";
};

const WaterComparisonCard = ({ brand, brandKey, isScanned, onTap }: { brand: WaterBrand; brandKey: string; isScanned: boolean; onTap: () => void }) => (
  <button
    onClick={onTap}
    className="flex w-[160px] shrink-0 snap-start flex-col rounded-2xl border bg-card p-4 text-left transition-all duration-150 active:scale-95 active:bg-water/5"
    style={{ borderColor: isScanned ? "hsl(var(--water))" : "hsl(var(--border))", borderWidth: isScanned ? "2px" : "1px" }}
  >
    {isScanned && (
      <span className="mb-2 self-start rounded-full bg-water/10 px-2.5 py-0.5 text-[10px] font-semibold text-water">Your scan</span>
    )}
    <p className="text-[14px] font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>{brand.name}</p>
    <span className="mt-1.5 self-start rounded-full bg-water/10 px-2.5 py-0.5 text-[10px] font-semibold text-water">{brand.type}</span>
    <div className="mt-3 flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: phDotColor(brand.ph) }} />
      <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{brand.ph.toFixed(1)}</span>
      <span className="text-[10px] text-muted-foreground">pH</span>
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>{brand.tds_mg_per_liter}</span>
      <span className="text-[10px] text-muted-foreground">mg/L TDS</span>
    </div>
    <div className="mt-3 space-y-1 border-t border-border pt-2">
      {[
        { label: "Ca", value: brand.minerals.calcium },
        { label: "Mg", value: brand.minerals.magnesium },
        { label: "Na", value: brand.minerals.sodium },
      ].map((m) => (
        <div key={m.label} className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{m.label}</span>
          <span className="font-medium tabular-nums">{m.value}</span>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 text-[10px]">
      {brand.pfas_tested ? (
        <><CheckCircle2 size={12} className="text-primary" /><span className="font-medium text-primary">PFAS tested</span></>
      ) : (
        <><Minus size={12} className="text-muted-foreground" /><span className="text-muted-foreground">PFAS n/a</span></>
      )}
    </div>
    <div className="mt-2 flex justify-end">
      <ChevronRight size={14} className="text-water" />
    </div>
  </button>
);

const HINT_KEY = "pure_water_compare_hint_seen";

const WaterComparison = ({ scannedBrandName }: { scannedBrandName?: string }) => {
  const navigate = useNavigate();
  const brands = WATER_COMPARE_KEYS.map((key) => ({ key, brand: WATER_DATABASE[key] })).filter((b) => !!b.brand);
  const scannedLower = scannedBrandName?.toLowerCase() ?? "";

  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(HINT_KEY)) {
      setShowHint(true);
      localStorage.setItem(HINT_KEY, "1");
    }
  }, []);

  const handleTap = (brandKey: string, brand: WaterBrand, isScanned: boolean) => {
    if (isScanned) {
      navigate(-1);
    } else {
      navigate("/water-report", { state: { product: { name: brand.name, brand: brand.name }, waterBrand: WATER_DATABASE[brandKey] } });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="flex items-center gap-3 px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-6 px-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Droplets size={20} className="text-water" />
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>Compare water brands</h1>
        </div>
        <div className="mt-5 -mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto">
          <div className="flex gap-3 snap-x snap-mandatory pb-4" style={{ scrollSnapType: "x mandatory" }}>
            {brands.map(({ key, brand }) => {
              const isScanned = !!scannedLower && (scannedLower.includes(brand.name.toLowerCase()) || brand.name.toLowerCase().includes(scannedLower));
              return <WaterComparisonCard key={brand.name} brand={brand} brandKey={key} isScanned={isScanned} onTap={() => handleTap(key, brand, isScanned)} />;
            })}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">Showing top-rated water brands by source quality and mineral profile</p>
        {showHint && <p className="mt-1.5 text-center text-[11px] text-muted-foreground/40">Tap any brand to see the full water report</p>}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────
const Alternatives = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { product?: ProductResult; waterMode?: boolean; scannedBrandName?: string } | null;
  const product = locationState?.product ?? null;
  const waterMode = locationState?.waterMode ?? false;

  if (waterMode) {
    return <WaterComparison scannedBrandName={locationState?.scannedBrandName ?? product?.brand} />;
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-28">
        <ScanLine size={48} className="text-muted-foreground/40" strokeWidth={1.5} />
        <h2 className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>No product scanned</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Scan a product first to see clean alternatives.</p>
        <button onClick={() => navigate("/scanner")} className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors">
          Go to Scanner
        </button>
      </div>
    );
  }

  const category = inferCategory(product.name, product.brand);
  const alternatives = getAlternatives(product);
  const flaggedCategories = [...new Set(product.flagged.map((f) => f.category))];

  if (alternatives.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="flex items-center gap-3 px-5 pt-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted">
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-24">
          <PackageOpen size={56} className="text-muted-foreground/30" strokeWidth={1.2} />
          <h2 className="mt-5 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>No alternatives in our database yet</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">We're adding new products weekly. Check back soon.</p>
          <button onClick={() => navigate("/scanner")} className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors">
            Scan something else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="flex items-center gap-3 px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-6 px-5 sm:px-6">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Cleaner alternatives to <span className="text-primary">{product.name}</span>
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Sorted by Pure Score — best first</p>

        <div className="mt-4 flex flex-col gap-2">
          {alternatives.map((alt) => (
            <AlternativeCard key={alt.name} alt={alt} flaggedCategories={flaggedCategories} category={category} scannedProductName={product.name} scannedProductScore={product.score} />
          ))}
        </div>

        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Info size={13} strokeWidth={1.8} />
          Pure scores are based on ingredient analysis. Always check labels.
        </div>
      </div>
    </div>
  );
};

export default Alternatives;
