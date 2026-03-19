import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProduct, analyzeIngredients } from "@/lib/scoring";
import { addScanToHistory } from "@/lib/scan-history";
import { canScan, recordScan } from "@/lib/scan-limits";
import { isWaterProduct, findWaterBrand } from "@/lib/water-database";
import { trackScan, trackUnknownBarcode } from "@/lib/track";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { toast } from "sonner";
import { Loader2, X, Camera } from "lucide-react";
import type { ProductResult } from "@/lib/scoring";

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

const Scanner = () => {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState<"barcode" | "label">("barcode");
  const [status, setStatus] = useState("Initializing camera…");
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualIngredients, setManualIngredients] = useState("");

  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const lastBarcode = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Navigation helper (keeps scan history, tracking, water detection) ---
  const navigateWithScan = useCallback(
    (product: ProductResult, method: "barcode" | "photo" | "manual" = "barcode") => {
      if (!canScan()) { navigate("/paywall"); return; }
      const { remaining } = recordScan();
      addScanToHistory(product);

      const categories = (product as any).categoriesRaw ?? "";
      const isWater = isWaterProduct(product.name, categories);
      const waterBrand = isWater ? findWaterBrand(product.name, product.brand) : undefined;
      trackScan(product, lastBarcode.current || undefined, isWater, waterBrand?.name, method);

      if (isWater) {
        navigate("/water-report", { state: { product, waterBrand, scansRemaining: remaining } });
      } else {
        navigate("/result", { state: { product, scansRemaining: remaining, fromPhotoScan: method === "photo" } });
      }
    },
    [navigate],
  );

  // --- Stop scanner ---
  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  }

  // --- Start scanner ---
  async function startScanner() {
    if (!window.Html5Qrcode) {
      setStatus("Scanner not available — reload the page");
      return;
    }
    await stopScanner();

    const scanner = new window.Html5Qrcode("qr-reader-element", { verbose: false });
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.7777,
          supportedScanTypes: [0],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (decodedText: string) => {
          console.log("SCAN SUCCESS:", decodedText);
          if (!mountedRef.current || !decodedText || decodedText.length < 4) return;
          // Prevent double-fire
          mountedRef.current = false;
          setScanning(true);
          setStatus("Found! Looking up product…");
          scanner.stop()
            .then(() => handleBarcode(decodedText))
            .catch(() => handleBarcode(decodedText));
        },
        () => {},
      );
      setStatus("Point camera at barcode");
    } catch (e: any) {
      console.error("Camera start error:", e);
      if (e?.message?.includes("NotAllowedError") || e?.name === "NotAllowedError") {
        setStatus("Camera access denied — allow camera in browser settings");
      } else {
        setStatus("Camera error: " + (e?.message || "unknown"));
      }
    }
  }

  // --- Handle a detected barcode ---
  async function handleBarcode(code: string) {
    // Haptic + beep
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200; gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}

    if (!canScan()) { navigate("/paywall"); return; }

    lastBarcode.current = code;
    try {
      const product = await fetchProduct(code);
      if (product) {
        navigateWithScan(product, "barcode");
        return;
      }
    } catch {}

    // Not found
    trackUnknownBarcode(code);
    setScanning(false);
    setBarcode(code);
    setNotFound(true);
    setShowManual(true);
    setStatus("Product not found");
  }

  // --- Manual barcode lookup ---
  async function handleBarcodeLookup() {
    if (!barcode.trim()) return;
    if (!canScan()) { navigate("/paywall"); return; }
    setLoading(true);
    setNotFound(false);
    try {
      lastBarcode.current = barcode.trim();
      const product = await fetchProduct(barcode.trim());
      if (product) {
        navigateWithScan(product, "barcode");
      } else {
        trackUnknownBarcode(barcode.trim());
        setNotFound(true);
      }
    } catch {
      trackUnknownBarcode(barcode.trim());
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // --- Manual ingredients ---
  function handleManualIngredients() {
    if (!manualIngredients.trim()) return;
    const { score, flagged } = analyzeIngredients(manualIngredients);
    const product: ProductResult = { name: "Manual Entry", brand: "—", score, ingredientsRaw: manualIngredients, flagged };
    navigateWithScan(product, "manual");
  }

  // --- Label scan (file input) ---
  const handleLabelCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Placeholder — label scan logic can be re-added later
    toast.info("Label scan coming soon — use barcode mode for now");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // --- Lifecycle ---
  useEffect(() => {
    mountedRef.current = true;
    if (scanMode === "barcode") {
      const timer = setTimeout(() => startScanner(), 300);
      return () => { clearTimeout(timer); mountedRef.current = false; void stopScanner(); };
    }
    return () => { mountedRef.current = false; void stopScanner(); };
  }, [scanMode]);

  return (
    <div className="fixed inset-0 z-40 bg-black" style={{ overflow: "visible", transform: "none", willChange: "auto" }}>
      {/* Hidden file input for label scan */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleLabelCapture} className="hidden" />

      {/* Camera renders here */}
      <div
        id="qr-reader-element"
        style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1,
          display: scanMode === "barcode" && !showManual ? "block" : "none",
        }}
      />

      {/* Black bg when no camera */}
      {scanMode === "label" && <div className="absolute inset-0 bg-black" style={{ zIndex: 1 }} />}

      {/* Loading overlay */}
      {scanning && (
        <div className="pointer-events-none absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-white/80">Identifying product…</p>
        </div>
      )}

      {/* Header */}
      <div className="fixed left-0 right-0 top-0 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]" style={{ zIndex: 10 }}>
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors active:bg-black/50"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
        <span className="text-[15px] font-bold tracking-tight text-white drop-shadow-sm" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span>
        </span>
        <div className="w-10" />
      </div>

      {/* Scan target overlay */}
      {scanMode === "barcode" && !showManual && (
        <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>
          <div style={{ width: 280, height: 180, border: "2px solid rgba(255,255,255,0.7)", borderRadius: 12, position: "relative" }}>
            <div
              className="absolute left-2 right-2 h-[2px] animate-scan-line"
              style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(157, 70%, 45%) 20%, hsl(157, 70%, 50%) 50%, hsl(157, 70%, 45%) 80%, transparent 100%)",
                boxShadow: "0 0 12px 2px hsla(157, 70%, 45%, 0.4)",
              }}
            />
          </div>
          <p className="mt-3 text-xs font-medium text-white/70 drop-shadow-sm">{status}</p>
        </div>
      )}

      {/* Bottom controls */}
      {!showManual && (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+12px)]" style={{ zIndex: 10 }}>
          <div
            className="flex flex-col items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
          >
            <div className="flex overflow-hidden rounded-full border border-white/15">
              <button
                onClick={() => setScanMode("barcode")}
                className={`px-5 py-1.5 text-xs font-semibold transition-colors ${
                  scanMode === "barcode" ? "bg-primary text-primary-foreground" : "bg-transparent text-white/60 active:text-white/80"
                }`}
              >
                Barcode
              </button>
              <button
                onClick={() => {
                  setScanMode("label");
                  void stopScanner();
                  setTimeout(() => fileInputRef.current?.click(), 300);
                }}
                className={`px-5 py-1.5 text-xs font-semibold transition-colors ${
                  scanMode === "label" ? "bg-primary text-primary-foreground" : "bg-transparent text-white/60 active:text-white/80"
                }`}
              >
                Label Scan
              </button>
            </div>
            <button
              onClick={() => { setShowManual(true); setNotFound(false); }}
              className="text-[11px] text-white/30 transition-colors active:text-white/50"
            >
              Enter barcode manually
            </button>
          </div>
        </div>
      )}

      {/* Manual entry panel */}
      {showManual && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-fade-in rounded-t-2xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Enter barcode</h3>
            <button onClick={() => { setShowManual(false); setNotFound(false); mountedRef.current = true; void startScanner(); }} className="text-muted-foreground active:text-foreground">
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
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleBarcodeLookup}
              disabled={loading || !barcode.trim()}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Look up"}
            </button>
          </div>

          {notFound && (
            <div className="mt-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">We don't have this product yet.</p>
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
                className="mt-2 w-full rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-colors disabled:opacity-50"
              >
                Analyze ingredients
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Scanner;
