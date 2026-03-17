import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Droplets, Leaf, Info, Lightbulb, Filter, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { WaterBrand } from "@/lib/water-database";
import { findWaterBrand } from "@/lib/water-database";

/* ─── Types ─── */
interface WaterProduct {
  name: string;
  brand: string;
  imageUrl?: string;
  categories?: string;
}

/* ─── Demo Data ─── */
const DEMO_PRODUCT: WaterProduct = {
  name: "FIJI Water 500ml",
  brand: "FIJI",
};

/* ─── Product Image ─── */
const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-[72px] w-[72px] shrink-0 rounded-2xl border border-border overflow-hidden bg-muted">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

/* ─── pH Helpers ─── */
const phColor = (ph: number) => {
  if (ph < 6.5) return "hsl(38, 92%, 50%)";
  if (ph > 7.5) return "hsl(var(--water))";
  return "hsl(var(--muted-foreground))";
};

const phContext = (ph: number) => {
  if (ph < 6.0) return "Acidic — may affect tooth enamel with frequent consumption.";
  if (ph < 6.5) return "Mildly acidic — slightly below the neutral range.";
  if (ph <= 7.5) return "Neutral — close to the body's natural pH of 7.4.";
  if (ph <= 8.5) return "Slightly alkaline — closer to the body's natural pH of 7.4.";
  return "Highly alkaline — artificially elevated pH through ionization.";
};

/* ─── Mineral max benchmarks (mg/L) for visual bars ─── */
const MINERAL_MAX: Record<string, number> = {
  calcium: 100,
  magnesium: 50,
  potassium: 20,
  sodium: 50,
  silica: 100,
};

/* ─── Component ─── */
const WaterReport = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { product?: WaterProduct; waterBrand?: WaterBrand } | null;
  const product = state?.product ?? DEMO_PRODUCT;
  const brand: WaterBrand | null =
    state?.waterBrand ?? findWaterBrand(product.name, product.brand);

  if (!brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <Droplets size={48} className="text-water" />
        <p className="text-center text-muted-foreground">
          We don't have detailed data for this water brand yet.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors active:bg-muted"
        >
          Go back
        </button>
      </div>
    );
  }

  const tdsPosition = Math.min((brand.tds_mg_per_liter / 400) * 100, 100);
  const phPosition = Math.min(Math.max((brand.ph / 14) * 100, 0), 100);

  const minerals = [
    { name: "Calcium", key: "calcium" as const, value: brand.minerals.calcium },
    { name: "Magnesium", key: "magnesium" as const, value: brand.minerals.magnesium },
    { name: "Potassium", key: "potassium" as const, value: brand.minerals.potassium },
    { name: "Sodium", key: "sodium" as const, value: brand.minerals.sodium },
    ...(brand.minerals.silica != null
      ? [{ name: "Silica", key: "silica" as const, value: brand.minerals.silica! }]
      : []),
  ];

  const handleShare = async () => {
    const shareText = `${brand.name} — pH ${brand.ph}, ${brand.tds_mg_per_liter} mg/L TDS, ${brand.type} water from ${brand.source}. Analyzed on Pure.`;
    const shareData = { title: `Water Report — ${brand.name}`, text: shareText, url: "https://getpure.app" };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} https://getpure.app`);
        toast({ title: "Copied to clipboard" });
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* ─── Product Info ─── */}
      <div className="mt-6 flex flex-col items-center px-6">
        <div className="flex items-center gap-4 w-full justify-center">
          {product.imageUrl ? (
            <ProductImage src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-border bg-muted">
              <Droplets size={24} strokeWidth={1.5} className="text-water" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {product.brand}
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {product.name}
            </h1>
          </div>
        </div>

        {/* Water Report Badge */}
        <div className="mt-5 flex flex-col items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-water/10 px-4 py-1.5 text-sm font-semibold text-water">
            <Droplets size={16} strokeWidth={2} />
            Water Report
          </span>
          <p className="text-[11px] text-muted-foreground">
            Source data from brand's official Consumer Confidence Report
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 px-6">
        {/* ─── SECTION 1 — Source ─── */}
        <div className="rounded-2xl border border-border bg-card p-5 border-l-4 border-l-water">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Source
          </p>
          <p className="mt-2 text-[15px] font-semibold leading-snug" style={{ fontFamily: "var(--font-display)" }}>
            {brand.source}
          </p>
          <span className="mt-2 inline-block rounded-full bg-water/10 px-3 py-0.5 text-[11px] font-semibold text-water">
            {brand.type}
          </span>
        </div>

        {/* ─── SECTION 2 — pH ─── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            pH Level
          </p>
          <p
            className="mt-3 text-center text-[48px] font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: phColor(brand.ph) }}
          >
            {brand.ph.toFixed(1)}
          </p>

          {/* pH scale bar */}
          <div className="relative mt-4 h-3 w-full rounded-full overflow-hidden">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(to right, hsl(0,72%,60%), hsl(38,92%,55%), hsl(48,80%,55%), hsl(120,40%,50%), hsl(199,89%,48%), hsl(240,60%,55%))",
              }}
            />
            {/* needle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-1.5 rounded-full bg-foreground border-2 border-background shadow-md"
              style={{ left: `${phPosition}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>Acidic</span>
            <span>Neutral</span>
            <span>Alkaline</span>
          </div>
          <p className="mt-3 text-center text-[13px] text-muted-foreground">
            {phContext(brand.ph)}
          </p>
        </div>

        {/* ─── SECTION 3 — TDS ─── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Total Dissolved Solids (TDS)
            </p>
            <div className="group relative">
              <Info size={14} className="text-muted-foreground cursor-help" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border border-border bg-popover p-3 text-[12px] text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-10">
                TDS measures total minerals in mg/L. Higher TDS = more minerals. Ideal range: 50–300 mg/L.
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[36px] font-bold leading-none" style={{ fontFamily: "var(--font-display)" }}>
            {brand.tds_mg_per_liter}
            <span className="ml-1 text-[14px] font-medium text-muted-foreground">mg/L</span>
          </p>

          {/* TDS bar */}
          <div className="relative mt-4 h-2.5 w-full rounded-full overflow-hidden bg-muted">
            {/* segments */}
            <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: "12.5%", background: "hsl(var(--muted-foreground) / 0.15)" }} />
            <div className="absolute inset-y-0" style={{ left: "12.5%", width: "62.5%", background: "hsl(var(--water) / 0.25)" }} />
            <div className="absolute inset-y-0 right-0 rounded-r-full" style={{ width: "25%", background: "hsl(38, 92%, 50%, 0.2)" }} />
            {/* needle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-1.5 rounded-full bg-foreground border-2 border-background shadow"
              style={{ left: `${tdsPosition}%` }}
            />
          </div>
          <div className="mt-1.5 flex text-[10px] text-muted-foreground">
            <span style={{ width: "12.5%" }}>Low</span>
            <span className="text-center" style={{ width: "62.5%" }}>Ideal (50–300)</span>
            <span className="text-right" style={{ width: "25%" }}>High</span>
          </div>
        </div>

        {/* ─── SECTION 4 — Minerals ─── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Mineral Profile
          </p>
          <div className="mt-4 space-y-3">
            {minerals.map((m) => {
              const max = MINERAL_MAX[m.key] || 100;
              const pct = Math.min((m.value / max) * 100, 100);
              return (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="w-24 text-[13px] text-muted-foreground">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-water transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                    {m.value} <span className="text-[10px] font-normal text-muted-foreground">mg/L</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/60 italic">
            Based on brand's published mineral analysis
          </p>
        </div>

        {/* ─── SECTION 5 — Filtration ─── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-water" strokeWidth={1.8} />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              How It's Made
            </p>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground">
            {brand.filtration}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {brand.pfas_tested ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <CheckCircle2 size={12} /> PFAS Tested
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                PFAS — Not disclosed
              </span>
            )}
            {brand.microplastics_tested ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <CheckCircle2 size={12} /> Microplastics Tested
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Microplastics — Not disclosed
              </span>
            )}
          </div>
        </div>

        {/* ─── SECTION 6 — Notable Fact ─── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-water" strokeWidth={1.8} />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Did You Know?
            </p>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">
            {brand.notable_fact}
          </p>
        </div>

        {/* ─── SECTION 7 — Transparency Footer ─── */}
        <div className="mt-2 flex flex-col items-center gap-2 py-4">
          <p className="text-center text-[11px] text-muted-foreground/60">
            Pure does not score water. We show you the facts from publicly available quality reports.
          </p>
          {brand.report_url && (
            <a
              href={brand.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-water transition-colors hover:underline"
            >
              View Official Report
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* ─── Bottom Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4 z-40">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate("/scanner")}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold transition-colors active:bg-muted"
          >
            Scan another
          </button>
          <button
            onClick={() => navigate("/alternatives", { state: { waterMode: true, scannedBrandName: brand.name } })}
            className="flex-1 rounded-xl bg-water py-3 text-sm font-bold text-water-foreground transition-colors active:opacity-90"
          >
            Compare brands
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaterReport;
