import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flashlight, FlashlightOff, Loader2, X } from "lucide-react";
import { fetchProduct, analyzeIngredients } from "@/lib/scoring";
import { addScanToHistory } from "@/lib/scan-history";
import { canScan, recordScan } from "@/lib/scan-limits";
import type { ProductResult } from "@/lib/scoring";

const CORNER_SIZE = 28;
const CORNER_WEIGHT = 3;

const CornerBrackets = () => {
  const style = (pos: Record<string, number | string>): React.CSSProperties => ({
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    ...pos,
  });
  const border = `${CORNER_WEIGHT}px solid hsl(var(--primary))`;
  return (
    <>
      <span style={{ ...style({ top: 0, left: 0 }), borderTop: border, borderLeft: border, borderTopLeftRadius: 8 }} />
      <span style={{ ...style({ top: 0, right: 0 }), borderTop: border, borderRight: border, borderTopRightRadius: 8 }} />
      <span style={{ ...style({ bottom: 0, left: 0 }), borderBottom: border, borderLeft: border, borderBottomLeftRadius: 8 }} />
      <span style={{ ...style({ bottom: 0, right: 0 }), borderBottom: border, borderRight: border, borderBottomRightRadius: 8 }} />
    </>
  );
};

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

const Scanner = () => {
  const navigate = useNavigate();
  const [torch, setTorch] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualIngredients, setManualIngredients] = useState("");
  const [showPulse, setShowPulse] = useState(false);

  const navigateWithScan = (product: ProductResult) => {
    if (!canScan()) {
      navigate("/paywall");
      return;
    }
    const { remaining } = recordScan();
    addScanToHistory(product);

    // Haptic-style visual pulse before navigating
    setShowPulse(true);
    setTimeout(() => {
      navigate("/result", { state: { product, scansRemaining: remaining } });
    }, 350);
  };

  const handleDemoScan = () => {
    navigateWithScan(DEMO_DATA);
  };

  const handleBarcodeLookup = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setNotFound(false);
    try {
      if (!canScan()) {
        navigate("/paywall");
        return;
      }
      const product = await fetchProduct(barcode.trim());
      if (product) {
        navigateWithScan(product);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualIngredients = () => {
    if (!manualIngredients.trim()) return;
    const { score, flagged } = analyzeIngredients(manualIngredients);
    const product: ProductResult = {
      name: "Manual Entry",
      brand: "—",
      score,
      ingredientsRaw: manualIngredients,
      flagged,
    };
    navigateWithScan(product);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0a]">
      {/* Scan-complete pulse overlay */}
      {showPulse && (
        <div className="absolute inset-0 z-[100] animate-scan-pulse bg-primary/40 pointer-events-none" />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] mt-4">
        <span className="text-sm font-semibold tracking-tight text-white/90" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span> Scanner
        </span>
        <button
          onClick={() => setTorch(!torch)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20"
        >
          {torch ? <Flashlight size={20} strokeWidth={1.8} /> : <FlashlightOff size={20} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Viewfinder area */}
      <div className="flex flex-1 flex-col items-center justify-center px-10">
        <div className="relative aspect-square w-full max-w-[260px]">
          <CornerBrackets />
          <div className="absolute inset-x-3 inset-y-3 overflow-hidden">
            <div
              className="absolute left-0 right-0 h-[2px] animate-scan-line"
              style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 100%)",
                opacity: 0.7,
              }}
            />
          </div>
          <div className="absolute inset-0 rounded-sm bg-white/[0.02]" />
        </div>

        <p className="mt-8 text-sm font-medium text-white/70">Point at any barcode</p>
        <button
          onClick={() => { setShowManual(true); setNotFound(false); }}
          className="mt-2 text-xs text-white/40 underline underline-offset-2 transition-colors active:text-white/60"
        >
          Enter barcode manually
        </button>
      </div>

      {/* Manual entry panel */}
      {showManual && (
        <div className="animate-fade-in absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Enter barcode
            </h3>
            <button onClick={() => { setShowManual(false); setNotFound(false); }} className="text-muted-foreground active:text-foreground">
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 0028400064057"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleBarcodeLookup}
              disabled={loading || !barcode.trim()}
              className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Look up"}
            </button>
          </div>

          {/* Loading skeleton for barcode lookup */}
          {loading && (
            <div className="mt-4 space-y-3">
              <div className="animate-pulse rounded-xl bg-muted h-4 w-3/4" />
              <div className="animate-pulse rounded-xl bg-muted h-4 w-1/2" />
              <div className="animate-pulse rounded-xl bg-muted h-12 w-full" />
            </div>
          )}

          {notFound && (
            <div className="mt-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                We don't have this product yet. You can still enter ingredients manually.
              </p>
              <textarea
                placeholder="Paste or type the ingredient list here…"
                value={manualIngredients}
                onChange={(e) => setManualIngredients(e.target.value)}
                rows={3}
                className="mt-3 w-full rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleManualIngredients}
                disabled={!manualIngredients.trim()}
                className="mt-2 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-50"
              >
                Analyze ingredients
              </button>
            </div>
          )}
        </div>
      )}

      {/* Demo button */}
      {!showManual && (
        <div className="px-6 pb-6 mb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleDemoScan}
            disabled={showPulse}
            className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-70"
          >
            Demo: Scan a product
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
