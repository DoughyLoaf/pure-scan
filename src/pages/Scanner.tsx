import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flashlight, FlashlightOff, Loader2, X, ChevronDown, ChevronUp, Check, Camera, Trash2 } from "lucide-react";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { fetchProduct, analyzeIngredients } from "@/lib/scoring";
import { addScanToHistory } from "@/lib/scan-history";
import { canScan, recordScan, getScansRemaining } from "@/lib/scan-limits";
import { isWaterProduct, findWaterBrand } from "@/lib/water-database";
import { trackScan, trackUnknownBarcode } from "@/lib/track";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { toast } from "sonner";
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

/* ─── Label Scan Overlay ─── */
const LabelOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[85%] h-[70%] rounded-2xl border-2 border-primary/60 flex items-center justify-center">
      <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90">
        Point at ingredient list
      </span>
    </div>
  </div>
);

/* ─── Not Found Panel with submission form ─── */
function NotFoundPanel({ barcode, manualIngredients, setManualIngredients, handleManualIngredients }: {
  barcode: string;
  manualIngredients: string;
  setManualIngredients: (v: string) => void;
  handleManualIngredients: () => void;
}) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [subName, setSubName] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!subName.trim()) return;
    try {
      supabase.from("product_submissions").insert({
        session_id: getSessionId(),
        barcode,
        product_name: subName.trim() || null,
        brand: subBrand.trim() || null,
        ingredients_raw: manualIngredients.trim() || null,
      } as any).then(() => {});
    } catch { /* fire & forget */ }
    setSubmitted(true);
  };

  return (
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

      {!submitted ? (
        <>
          <button
            onClick={() => setShowSubmit(!showSubmit)}
            className="mt-3 flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            Help us add this product →
            {showSubmit ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showSubmit && (
            <div className="mt-2 space-y-2 animate-fade-in">
              <input type="text" placeholder="Product name" value={subName} onChange={(e) => setSubName(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="text" placeholder="Brand (optional)" value={subBrand} onChange={(e) => setSubBrand(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleSubmit} disabled={!subName.trim()}
                className="w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors disabled:opacity-50 hover:bg-primary/20">
                Submit product info
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
          <Check size={14} />
          <span>Thank you — we'll add this soon</span>
        </div>
      )}
    </div>
  );
}


const Scanner = () => {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState<"barcode" | "label">("barcode");
  const [torch, setTorch] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualIngredients, setManualIngredients] = useState("");
  const [showPulse, setShowPulse] = useState(false);
  const [blocked, setBlocked] = useState(!canScan());
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [showManualIngredientEntry, setShowManualIngredientEntry] = useState(false);
  const [manualIngredientsLabel, setManualIngredientsLabel] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setBlocked(!canScan());
  }, []);

  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    readerRef.current?.reset();
    readerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setTorch(false);
    setScannerStarted(false);
  }, []);

  useEffect(() => {
    if (showManual) stopScanner();
  }, [showManual, stopScanner]);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      track.applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] }).catch(() => {});
    }
  }, [torch]);

  // When switching modes, stop barcode decoder but keep camera alive if label mode
  useEffect(() => {
    if (scanMode === "label") {
      // Stop the barcode reader but keep camera stream
      scanningRef.current = false;
      readerRef.current?.reset();
      readerRef.current = null;
    }
  }, [scanMode]);

  const navigateWithScan = (product: ProductResult, method: 'barcode' | 'photo' | 'manual' = 'barcode', forceIsWater?: boolean) => {
    if (!canScan()) { navigate("/paywall"); return; }
    const { remaining } = recordScan();
    addScanToHistory(product);
    setShowPulse(true);
    const categories = (product as any).categoriesRaw ?? "";
    const isWater = forceIsWater === true || isWaterProduct(product.name, categories);
    const waterBrand = isWater ? findWaterBrand(product.name, product.brand) : undefined;

    trackScan(product, lastBarcode.current || undefined, isWater, waterBrand?.name, method);

    if (isWater) {
      setTimeout(() => {
        navigate("/water-report", { state: { product, waterBrand, scansRemaining: remaining } });
      }, 350);
    } else {
      setTimeout(() => {
        navigate("/result", { state: { product, scansRemaining: remaining } });
      }, 350);
    }
  };

  const handleDetectedBarcode = useCallback(
    async (code: string) => {
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

      stopScanner();

      if (!canScan()) { navigate("/paywall"); return; }

      setScanLoading(true);
      try {
        lastBarcode.current = code;
        const product = await fetchProduct(code);
        if (product) {
          navigateWithScan(product, 'barcode');
        } else {
          trackUnknownBarcode(code);
          setScanLoading(false);
          setBarcode(code);
          setNotFound(true);
          setShowManual(true);
        }
      } catch {
        trackUnknownBarcode(code);
        setScanLoading(false);
        setBarcode(code);
        setNotFound(true);
        setShowManual(true);
      }
    },
    [navigate, stopScanner]
  );

  const startCamera = useCallback(async () => {
    if (blocked || showManual || !videoRef.current) return;
    if (streamRef.current) return; // already running
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScannerStarted(true);
    } catch (error) {
      console.error("Camera start error:", error);
      setCameraError("Camera access failed. Tap again or use manual entry.");
    }
  }, [blocked, showManual]);

  const startBarcodeDecoder = useCallback(async () => {
    if (!streamRef.current || !videoRef.current || scanningRef.current) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
    ]);

    const reader = new BrowserMultiFormatReader(hints, 500);
    readerRef.current = reader;
    scanningRef.current = true;

    reader.decodeFromStream(streamRef.current, videoRef.current, (result) => {
      if (!scanningRef.current || !result) return;
      scanningRef.current = false;
      void handleDetectedBarcode(result.getText());
    });
  }, [handleDetectedBarcode]);

  const startScanner = useCallback(async () => {
    if (blocked || showManual || scannerStarted || !videoRef.current) return;
    await startCamera();
    if (scanMode === "barcode") {
      // Small delay to ensure camera is fully started
      setTimeout(() => startBarcodeDecoder(), 100);
    }
  }, [blocked, showManual, scannerStarted, scanMode, startCamera, startBarcodeDecoder]);

  const lastBarcode = useRef<string>("");

  /* ─── Photo Capture (Label Scan mode) ─── */
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current || photoProcessing) return;
    if (!canScan()) { navigate("/paywall"); return; }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    setPhotoProcessing(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("extract-ingredients", {
        body: { images: [base64] },
      });

      if (fnError || !data) throw new Error(fnError?.message || "Failed to process image");

      if (data.error === "no_label_visible") {
        toast.error("Point camera directly at the ingredient list");
        setPhotoProcessing(false);
        return;
      }

      if (data.confidence === "low") {
        toast.error("Image unclear — try better lighting");
        setPhotoProcessing(false);
        return;
      }

      const ingredientsRaw = data.ingredients_raw || data.ingredient_text_raw || "";
      const isWaterDetected = data.is_water === true;
      const detectedBarcode = data.barcode || null;
      const category = data.category || "";

      // For water products without ingredients, still allow navigation
      if (!ingredientsRaw.trim() && !isWaterDetected) {
        toast.error("Couldn't read ingredients. Try a clearer photo.");
        setPhotoProcessing(false);
        return;
      }

      const { score, flagged } = ingredientsRaw.trim()
        ? analyzeIngredients(ingredientsRaw)
        : { score: 100, flagged: [] };

      const product: ProductResult = {
        name: data.product_name || "Photo Scanned Product",
        brand: data.brand || data.brand_name || "Unknown Brand",
        score,
        ingredientsRaw,
        flagged,
        categoriesRaw: category,
      };

      // Enrich database: store in product_submissions
      try {
        supabase.from("product_submissions").insert({
          session_id: getSessionId(),
          barcode: detectedBarcode || "PHOTO_SCAN_" + Date.now(),
          product_name: product.name,
          brand: product.brand,
          ingredients_raw: ingredientsRaw,
          status: "auto_extracted",
          notes: JSON.stringify({
            confidence: data.confidence,
            source: "photo_scan",
            label_type: data.label_type,
            label_coverage: data.label_coverage,
            is_water: isWaterDetected,
            nutrition: data.nutrition,
            water_data: data.water_data,
          }),
        } as any).then(() => {});
      } catch { /* fire & forget */ }

      lastBarcode.current = detectedBarcode || "";
      navigateWithScan(product, 'photo');
    } catch (err: any) {
      console.error("Photo scan error:", err);
      const msg = err?.message?.includes("AbortError") || err?.message?.includes("timeout")
        ? "Scan taking too long — try again"
        : "Could not read label — try better lighting or type manually";
      toast.error(msg);
      setPhotoProcessing(false);
    }
  }, [navigate, photoProcessing]);

  /* ─── Manual ingredient entry for label mode ─── */
  const handleManualLabelIngredients = () => {
    if (!manualIngredientsLabel.trim()) return;
    const { score, flagged } = analyzeIngredients(manualIngredientsLabel);
    const product: ProductResult = {
      name: "Manual Entry",
      brand: "—",
      score,
      ingredientsRaw: manualIngredientsLabel,
      flagged,
    };
    navigateWithScan(product, 'manual');
  };

  const handleBarcodeLookup = async () => {
    if (!barcode.trim()) return;
    if (blocked) { navigate("/paywall"); return; }
    setLoading(true);
    setNotFound(false);
    try {
      lastBarcode.current = barcode.trim();
      const product = await fetchProduct(barcode.trim());
      if (product) {
        navigateWithScan(product, 'barcode');
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
    navigateWithScan(product, 'manual');
  };

  const handleModeSwitch = (mode: "barcode" | "label") => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setShowManual(false);
    setShowManualIngredientEntry(false);
    setNotFound(false);

    if (mode === "barcode" && scannerStarted) {
      startBarcodeDecoder();
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 z-40 flex flex-col bg-[#0a0a0a]">
      <canvas ref={canvasRef} className="hidden" />

      {showPulse && (
        <div className="absolute inset-0 z-[100] animate-scan-pulse bg-primary/40 pointer-events-none" />
      )}

      {(scanLoading || photoProcessing) && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black/60 pointer-events-none">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-white/80">
            {photoProcessing ? "Reading ingredients…" : "Identifying product…"}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] mt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
        <span className="text-sm font-semibold tracking-tight text-white/90" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span> Scanner
        </span>
        <button
          onClick={() => setTorch(!torch)}
          disabled={!scannerStarted}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20 disabled:opacity-40"
        >
          {torch ? <Flashlight size={20} strokeWidth={1.8} /> : <FlashlightOff size={20} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex flex-1 flex-col items-center justify-center px-10">
        <button
          type="button"
          onClick={() => void startScanner()}
          disabled={scannerStarted || blocked || scanLoading || photoProcessing}
          className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-sm disabled:cursor-default"
          aria-label="Start camera scanner"
        >
          {scanMode === "barcode" ? <CornerBrackets /> : null}
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline muted autoPlay
          />

          {scanMode === "label" && scannerStarted && <LabelOverlay />}

          {!scannerStarted && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-primary/90 px-5 py-2 text-sm font-semibold text-primary-foreground">
                Tap to scan
              </span>
            </div>
          )}

          {scanMode === "barcode" && (
            <>
              <div className="absolute inset-x-3 inset-y-3 overflow-hidden pointer-events-none">
                <div
                  className="absolute left-0 right-0 h-[2px] animate-scan-line"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 100%)",
                    opacity: 0.7,
                  }}
                />
              </div>
              <div className="absolute inset-0 rounded-sm bg-white/[0.02] pointer-events-none" />
            </>
          )}
        </button>

        {/* Mode pill selector */}
        <div className="mt-5 flex rounded-full border border-white/20 overflow-hidden">
          <button
            onClick={() => handleModeSwitch("barcode")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              scanMode === "barcode"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-white/60 active:text-white/80"
            }`}
          >
            📷 Barcode
          </button>
          <button
            onClick={() => handleModeSwitch("label")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              scanMode === "label"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-white/60 active:text-white/80"
            }`}
          >
            🔍 Label Scan
          </button>
        </div>

        {/* Mode-specific status text & actions */}
        {scanMode === "barcode" ? (
          <>
            {cameraError ? (
              <p className="mt-4 px-4 text-center text-sm font-medium text-destructive">{cameraError}</p>
            ) : scannerStarted ? (
              <p className="mt-4 text-sm text-white/50">Point at any barcode</p>
            ) : (
              <p className="mt-4 text-xs text-white/40">Tap the viewfinder to start the camera</p>
            )}
            <button
              onClick={() => { setShowManual(true); setNotFound(false); }}
              className="mt-3 text-xs text-white/40 underline underline-offset-2 transition-colors active:text-white/60"
            >
              Enter barcode manually
            </button>
          </>
        ) : (
          <>
            {cameraError ? (
              <p className="mt-4 px-4 text-center text-sm font-medium text-destructive">{cameraError}</p>
            ) : scannerStarted ? (
              <p className="mt-4 text-sm text-white/50">📸 Take a clear photo of the ingredient list</p>
            ) : (
              <p className="mt-4 text-xs text-white/40">Tap the viewfinder to start the camera</p>
            )}

            {/* Capture button */}
            {scannerStarted && !photoProcessing && (
              <button
                onClick={capturePhoto}
                disabled={photoProcessing}
                className="mt-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 text-white transition-all active:scale-95 active:bg-white/40"
                aria-label="Capture photo"
              >
                <Camera size={24} />
              </button>
            )}

            <button
              onClick={() => setShowManualIngredientEntry(true)}
              className="mt-3 text-xs text-white/40 underline underline-offset-2 transition-colors active:text-white/60"
            >
              Type ingredients manually
            </button>
          </>
        )}
      </div>

      {/* Manual barcode entry panel */}
      {showManual && scanMode === "barcode" && (
        <div className="animate-fade-in absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Enter barcode</h3>
            <button onClick={() => { setShowManual(false); setNotFound(false); }} className="text-muted-foreground active:text-foreground">
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" inputMode="numeric" placeholder="e.g. 0028400064057" value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={handleBarcodeLookup} disabled={loading || !barcode.trim()}
              className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Look up"}
            </button>
          </div>
          {loading && (
            <div className="mt-4 space-y-3">
              <div className="animate-pulse rounded-xl bg-muted h-4 w-3/4" />
              <div className="animate-pulse rounded-xl bg-muted h-4 w-1/2" />
              <div className="animate-pulse rounded-xl bg-muted h-12 w-full" />
            </div>
          )}
          {notFound && (
            <NotFoundPanel barcode={barcode} manualIngredients={manualIngredients}
              setManualIngredients={setManualIngredients} handleManualIngredients={handleManualIngredients} />
          )}
        </div>
      )}

      {/* Manual ingredient entry panel for label mode */}
      {showManualIngredientEntry && scanMode === "label" && (
        <div className="animate-fade-in absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Type ingredients</h3>
            <button onClick={() => setShowManualIngredientEntry(false)} className="text-muted-foreground active:text-foreground">
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>
          <textarea
            placeholder="Paste or type the ingredient list here…"
            value={manualIngredientsLabel}
            onChange={(e) => setManualIngredientsLabel(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={handleManualLabelIngredients} disabled={!manualIngredientsLabel.trim()}
            className="mt-3 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-50">
            Analyze ingredients
          </button>
        </div>
      )}

      {/* Blocked upgrade button */}
      {!showManual && !showManualIngredientEntry && blocked && (
        <div className="px-6 pb-6 mb-[env(safe-area-inset-bottom)]">
          <button onClick={() => navigate("/paywall")}
            className="w-full rounded-xl bg-destructive/90 px-6 py-3.5 text-sm font-semibold text-destructive-foreground transition-colors">
            No scans left — Upgrade
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
