import { useState, useEffect, useRef, useCallback, Component, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Flashlight, FlashlightOff, Loader2, X, ChevronDown, ChevronUp, Check, Camera, Package, ListChecks } from "lucide-react";
// html5-qrcode loaded via CDN in index.html — access via window.Html5Qrcode
declare const Html5Qrcode: any;
import { fetchProduct, analyzeIngredients } from "@/lib/scoring";
import { addScanToHistory } from "@/lib/scan-history";
import { canScan, recordScan } from "@/lib/scan-limits";
import { isWaterProduct, findWaterBrand } from "@/lib/water-database";
import { trackScan, trackUnknownBarcode } from "@/lib/track";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { toast } from "sonner";
import { processPhotoScan, submitUserCorrection, compressImageForAI } from "@/lib/photo-scan";
import type { ProductResult } from "@/lib/scoring";
import type { PhotoScanResult } from "@/lib/photo-scan";

/* ─── Error Boundary ─── */
interface ErrorBoundaryProps { children: ReactNode; fallback: ReactNode; onError?: (error: Error) => void }
interface ErrorBoundaryState { hasError: boolean }

class ScannerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error) { this.props.onError?.(error); console.error("Scanner error boundary caught:", error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ─── Label Scan Overlay ─── */
const LabelOverlay = ({ text }: { text?: string }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[85%] h-[70%] rounded-2xl border-2 border-primary/60 flex items-center justify-center">
      <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90">
        {text || "Point at ingredient list"}
      </span>
    </div>
  </div>
);

/* ─── Product-shaped outline for front label ─── */
const FrontLabelOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[75%] h-[60%] rounded-2xl border-2 border-primary/60 border-dashed flex flex-col items-center justify-center gap-2">
      <Package size={28} className="text-primary/70" />
      <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90">
        Align front of product here
      </span>
    </div>
  </div>
);

/* ─── Ingredients label outline ─── */
const IngredientsOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[85%] h-[60%] rounded-2xl border-2 border-primary/60 flex flex-col items-center justify-center gap-2">
      <ListChecks size={28} className="text-primary/70" />
      <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90">
        Align ingredients label here
      </span>
    </div>
  </div>
);

/* ─── Step Indicator ─── */
const StepIndicator = ({ current }: { current: 1 | 2 }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
      current >= 1 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/40"
    }`}>1</div>
    <div className={`h-0.5 w-8 ${current >= 2 ? "bg-primary" : "bg-white/20"}`} />
    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
      current >= 2 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/40"
    }`}>2</div>
  </div>
);

/* ─── Not Found Panel with submission form ─── */
function NotFoundPanel({ barcode, manualIngredients, setManualIngredients, handleManualIngredients, onPhotoScan }: {
  barcode: string;
  manualIngredients: string;
  setManualIngredients: (v: string) => void;
  handleManualIngredients: () => void;
  onPhotoScan: () => void;
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
        We don't have this product yet.
      </p>

      <button
        onClick={onPhotoScan}
        className="mt-3 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Camera size={18} />
        Scan product with camera
      </button>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        Take 2 quick photos to get your score instantly
      </p>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or type manually</span></div>
      </div>

      <textarea
        placeholder="Paste or type the ingredient list here…"
        value={manualIngredients}
        onChange={(e) => setManualIngredients(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        onClick={handleManualIngredients}
        disabled={!manualIngredients.trim()}
        className="mt-2 w-full rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-colors disabled:opacity-50"
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

/* ─── Label Scan Content (wrapped in error boundary) ─── */
function LabelScanContent({
  scannerStarted,
  photoProcessing,
  capturePhoto,
  showManualIngredientEntry,
}: {
  scannerStarted: boolean;
  photoProcessing: boolean;
  capturePhoto: () => void;
  showManualIngredientEntry: boolean;
}) {
  return (
    <>
      {scannerStarted && <div className="absolute inset-0 z-20"><LabelOverlay /></div>}
      {scannerStarted && !photoProcessing && !showManualIngredientEntry && (
        <div className="absolute left-0 right-0 z-30 flex justify-center" style={{ bottom: "calc(35% + 16px)" }}>
          <button
            onClick={capturePhoto}
            disabled={photoProcessing}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 backdrop-blur-sm text-white transition-all active:scale-95 active:bg-white/40"
            aria-label="Capture photo"
          >
            <Camera size={24} />
          </button>
        </div>
      )}
    </>
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
  const [photoProgress, setPhotoProgress] = useState("");
  const [showManualIngredientEntry, setShowManualIngredientEntry] = useState(false);
  const [manualIngredientsLabel, setManualIngredientsLabel] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<PhotoScanResult | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [labelScanError, setLabelScanError] = useState(false);

  // Two-step photo scan state
  type PhotoScanStep = "idle" | "front" | "front_captured" | "ingredients" | "processing";
  const [photoScanStep, setPhotoScanStep] = useState<PhotoScanStep>("idle");
  const [frontImageBase64, setFrontImageBase64] = useState<string>("");
  const [frontData, setFrontData] = useState<any>(null);
  const notFoundBarcode = useRef<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoStarted = useRef(false);
  const lastBarcode = useRef<string>("");

  useEffect(() => {
    setBlocked(!canScan());
  }, []);

  /* ─── Stop html5-qrcode scanner ─── */
  const stopBarcodeScanner = useCallback(async () => {
    scanningRef.current = false;
    if (html5QrRef.current) {
      try {
        const state = html5QrRef.current.getState();
        if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
          await html5QrRef.current.stop();
        }
      } catch {}
      try { html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
  }, []);

  /* ─── Stop camera stream ─── */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ─── Stop everything ─── */
  const stopScanner = useCallback(async () => {
    await stopBarcodeScanner();
    stopCameraStream();
    setTorch(false);
    setScannerStarted(false);
  }, [stopBarcodeScanner, stopCameraStream]);

  useEffect(() => {
    if (showManual && photoScanStep === "idle") { void stopScanner(); }
  }, [showManual, stopScanner, photoScanStep]);

  useEffect(() => {
    return () => { void stopScanner(); };
  }, [stopScanner]);

  /* ─── Torch toggle ─── */
  useEffect(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      track.applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] }).catch(() => {});
    }
  }, [torch]);

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
        navigate("/result", { state: { product, scansRemaining: remaining, fromPhotoScan: method === 'photo' } });
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

      void stopScanner();

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
          notFoundBarcode.current = code;
          setNotFound(true);
          setShowManual(true);
        }
      } catch {
        trackUnknownBarcode(code);
        setScanLoading(false);
        setBarcode(code);
        notFoundBarcode.current = code;
        setNotFound(true);
        setShowManual(true);
      }
    },
    [navigate, stopScanner]
  );

  /* ─── Start camera for label scan / photo capture (raw getUserMedia) ─── */
  const startCameraStream = useCallback(async () => {
    if (blocked || !videoRef.current) return;
    if (streamRef.current) return; // already running
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.muted = true;

        await videoRef.current.play().catch(() => {
          return new Promise<void>((resolve) => {
            setTimeout(async () => {
              try { await videoRef.current?.play(); } catch {}
              resolve();
            }, 200);
          });
        });

        setScannerStarted(true);
      }
    } catch (error: any) {
      console.error("Camera start error:", error);
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera access in your browser settings, then reload.");
      } else if (error?.name === "NotFoundError") {
        setCameraError("No camera found. Use manual entry below.");
      } else if (error?.name === "NotReadableError" || error?.name === "AbortError") {
        setCameraError("Camera is in use by another app. Close other apps and try again.");
      } else {
        setCameraError("Camera access denied. Use manual entry below.");
      }
    }
  }, [blocked]);

  /* ─── Start html5-qrcode barcode scanner ─── */
  const startBarcodeScanner = useCallback(async () => {
    if (scanningRef.current || blocked) return;

    // Stop any existing instance first
    await stopBarcodeScanner();

    // Ensure the container element exists
    const container = document.getElementById("qr-reader");
    if (!container) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrRef.current = html5QrCode;
      scanningRef.current = true;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          if (!scanningRef.current) return;
          if (decodedText && decodedText.length >= 4) {
            scanningRef.current = false;
            void handleDetectedBarcode(decodedText);
          }
        },
        () => {
          // Ignore per-frame decode errors — normal when no barcode in view
        }
      );

      setScannerStarted(true);
    } catch (err: any) {
      console.error("html5-qrcode start error:", err);
      scanningRef.current = false;
      // Fall back to raw camera stream so the user at least sees something
      if (!streamRef.current) {
        await startCameraStream();
      }
      if (err?.message?.includes("NotAllowedError") || err?.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera access in your browser settings, then reload.");
      } else if (err?.message?.includes("NotFoundError")) {
        setCameraError("No camera found. Use manual entry below.");
      }
    }
  }, [blocked, handleDetectedBarcode, stopBarcodeScanner, startCameraStream]);

  /* ─── Combined start ─── */
  const startScanner = useCallback(async () => {
    if (blocked || (showManual && photoScanStep === "idle") || scannerStarted) return;

    if (scanMode === "barcode") {
      await startBarcodeScanner();
    } else {
      await startCameraStream();
    }
  }, [blocked, showManual, scannerStarted, scanMode, startBarcodeScanner, startCameraStream, photoScanStep]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStarted.current || blocked || showManual) return;
    autoStarted.current = true;
    const timer = setTimeout(() => {
      void startScanner();
    }, 300);
    return () => clearTimeout(timer);
  }, [blocked, showManual]);

  // Re-start barcode scanner when returning from label mode
  useEffect(() => {
    if (scanMode === "barcode" && !scanningRef.current && !scannerStarted && !showManual && autoStarted.current) {
      void startBarcodeScanner();
    }
  }, [scanMode, scannerStarted, showManual, startBarcodeScanner]);

  /* ─── Capture current frame as base64 ─── */
  const captureFrame = useCallback((): string | null => {
    // Try from the raw video element first (label scan mode)
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    }

    // Try from html5-qrcode's internal video (barcode mode)
    const qrVideo = document.querySelector("#qr-reader video") as HTMLVideoElement | null;
    if (qrVideo && qrVideo.videoWidth > 0) {
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = qrVideo.videoWidth;
      canvas.height = qrVideo.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(qrVideo, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    }

    return null;
  }, []);

  /* ─── Upload image to storage ─── */
  const uploadImage = async (base64: string, folder: string): Promise<string | null> => {
    try {
      const { compressed } = await compressImageForAI(base64);
      const blob = await (await fetch(compressed)).blob();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) { console.error("Upload error:", error); return null; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  /* ─── Two-step photo scan: initiate from not-found panel ─── */
  const startTwoStepPhotoScan = useCallback(async () => {
    setShowManual(false);
    setNotFound(false);
    setPhotoScanStep("front");
    setScanMode("label");

    // Stop barcode scanner, start raw camera for photo capture
    await stopBarcodeScanner();
    if (!streamRef.current) {
      await startCameraStream();
    }
  }, [stopBarcodeScanner, startCameraStream]);

  /* ─── Capture front label photo ─── */
  const captureFrontPhoto = useCallback(async () => {
    if (photoProcessing) return;
    const frame = captureFrame();
    if (!frame) { toast.error("Camera not ready"); return; }

    setPhotoProcessing(true);
    setPhotoProgress("Reading front label…");

    try {
      const { compressed } = await compressImageForAI(frame);
      setFrontImageBase64(compressed);

      const { data, error } = await supabase.functions.invoke("extract-product-photos", {
        body: { step: "front", image: compressed },
      });

      if (error || !data) throw new Error(error?.message || "Failed to read front label");
      if (data.error === "no_label_visible") {
        toast.error("Couldn't read the front label. Try again with better lighting.");
        setPhotoProcessing(false);
        setPhotoProgress("");
        return;
      }

      setFrontData(data);
      setPhotoScanStep("front_captured");
      setPhotoProcessing(false);
      setPhotoProgress("");

      setTimeout(() => setPhotoScanStep("ingredients"), 800);
    } catch (err: any) {
      console.error("Front label error:", err);
      toast.error("Couldn't read front label. Try again.");
      setPhotoProcessing(false);
      setPhotoProgress("");
    }
  }, [captureFrame, photoProcessing]);

  /* ─── Capture ingredients photo and process full result ─── */
  const captureIngredientsPhoto = useCallback(async () => {
    if (photoProcessing) return;
    const frame = captureFrame();
    if (!frame) { toast.error("Camera not ready"); return; }

    setPhotoProcessing(true);
    setPhotoProgress("Reading ingredients…");
    setPhotoScanStep("processing");

    try {
      const { compressed: ingredientsCompressed } = await compressImageForAI(frame);

      const { data: ingredData, error: ingredError } = await supabase.functions.invoke("extract-product-photos", {
        body: { step: "ingredients", image: ingredientsCompressed },
      });

      if (ingredError || !ingredData) throw new Error(ingredError?.message || "Failed to read ingredients");
      if (ingredData.error === "no_ingredients_visible") {
        toast.error("Couldn't read ingredients. Try a clearer photo.");
        setPhotoScanStep("ingredients");
        setPhotoProcessing(false);
        setPhotoProgress("");
        return;
      }

      const ingredientsRaw = ingredData.ingredient_text_raw || "";
      if (!ingredientsRaw.trim()) {
        toast.error("No ingredients found. Try getting closer to the label.");
        setPhotoScanStep("ingredients");
        setPhotoProcessing(false);
        setPhotoProgress("");
        return;
      }

      const productName = frontData?.product_name || "Photo Scanned Product";
      const brandName = frontData?.brand_name || "Unknown Brand";
      const isWater = frontData?.is_water === true;

      setPhotoProgress("Calculating Pure Score…");
      const { score, flagged } = analyzeIngredients(ingredientsRaw);

      setPhotoProgress("Saving to database…");
      const [frontUrl, ingredientsUrl] = await Promise.all([
        uploadImage(frontImageBase64, "front"),
        uploadImage(ingredientsCompressed, "ingredients"),
      ]);

      const product: ProductResult = {
        name: productName,
        brand: brandName,
        score,
        ingredientsRaw,
        flagged,
        categoriesRaw: frontData?.category || "",
      };

      const barcodeValue = notFoundBarcode.current || `photo_${Date.now()}`;
      try {
        await (supabase as any).rpc("upsert_product", {
          p_barcode: barcodeValue,
          p_product_name: productName,
          p_brand: brandName,
          p_pure_score: score,
          p_ingredients_raw: ingredientsRaw,
          p_flagged_count: flagged.length,
          p_flagged_categories: [...new Set(flagged.map(f => f.category))],
          p_flagged_ingredients: flagged.map(f => f.name),
          p_categories_raw: frontData?.category || "",
          p_image_url: frontUrl || "",
          p_is_water: isWater,
          p_water_brand: "",
        });

        if (frontUrl || ingredientsUrl) {
          await supabase
            .from("products")
            .update({
              front_image_url: frontUrl,
              ingredients_image_url: ingredientsUrl,
              data_confidence: "medium",
              needs_review: false,
              enrichment_source: "photo_scan",
              data_source: "photo_scan",
            } as any)
            .eq("barcode", barcodeValue);
        }
      } catch (err) {
        console.error("Product save error:", err);
      }

      try {
        supabase.from("enrichment_queue" as any).insert({
          session_id: getSessionId(),
          product_name: productName,
          brand: brandName,
          barcode: barcodeValue,
          ingredient_text_raw: ingredientsRaw,
          confidence: ingredData.confidence || "medium",
          image_size_bytes: Math.round(ingredientsCompressed.length * 0.75),
          processing_status: "pending",
        }).then(() => {});
      } catch {}

      setPhotoScanStep("idle");
      setFrontImageBase64("");
      setFrontData(null);
      setPhotoProcessing(false);
      setPhotoProgress("");
      lastBarcode.current = barcodeValue;

      navigateWithScan(product, 'photo', isWater);
    } catch (err: any) {
      console.error("Ingredients capture error:", err);
      toast.error("Could not read ingredients. Try better lighting or type manually.");
      setPhotoScanStep("ingredients");
      setPhotoProcessing(false);
      setPhotoProgress("");
    }
  }, [captureFrame, frontData, frontImageBase64, photoProcessing, navigate]);

  /* ─── Cancel two-step flow ─── */
  const cancelTwoStepFlow = () => {
    setPhotoScanStep("idle");
    setFrontImageBase64("");
    setFrontData(null);
    setPhotoProcessing(false);
    setPhotoProgress("");
    setScanMode("barcode");
  };

  /* ─── Photo Capture (Label Scan mode — original single-capture) ─── */
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current || photoProcessing) return;
    if (!canScan()) { navigate("/paywall"); return; }

    const frame = captureFrame();
    if (!frame) return;

    setPhotoProcessing(true);
    setPhotoProgress("Compressing image…");

    try {
      const result = await processPhotoScan(frame, (step) => setPhotoProgress(step));

      if (result.confidence === "low") {
        toast.error("Couldn't read this label clearly. Try better lighting or get closer.");
        setPhotoProcessing(false);
        setPhotoProgress("");
        return;
      }

      if (result.needsConfirmation) {
        setPendingConfirmation(result);
        setConfirmText(result.extractedText);
        setPhotoProcessing(false);
        setPhotoProgress("");
        return;
      }

      lastBarcode.current = result.rawResponse?.barcode || "";
      const isWater = result.rawResponse?.is_water === true;
      navigateWithScan(result.product, 'photo', isWater);
    } catch (err: any) {
      console.error("Photo scan error:", err);
      if (err.message === "no_label_visible") {
        toast.error("Point camera directly at the ingredient list");
      } else if (err.message === "no_ingredients") {
        toast.error("Couldn't read ingredients. Try a clearer photo.");
      } else {
        const msg = err?.message?.includes("timeout")
          ? "Scan taking too long — try again"
          : "Could not read label — try better lighting or type manually";
        toast.error(msg);
      }
      setPhotoProcessing(false);
      setPhotoProgress("");
    }
  }, [navigate, photoProcessing, captureFrame]);

  const handleConfirmIngredients = () => {
    if (!pendingConfirmation) return;
    const wasEdited = confirmText !== pendingConfirmation.extractedText;
    let product: ProductResult;

    if (wasEdited) {
      product = submitUserCorrection(pendingConfirmation.product, confirmText, pendingConfirmation.rawResponse);
    } else {
      product = pendingConfirmation.product;
    }

    lastBarcode.current = pendingConfirmation.rawResponse?.barcode || "";
    const isWater = pendingConfirmation.rawResponse?.is_water === true;
    setPendingConfirmation(null);
    navigateWithScan(product, 'photo', isWater);
  };

  const handleRetakePhoto = () => {
    setPendingConfirmation(null);
    setConfirmText("");
  };

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
      notFoundBarcode.current = barcode.trim();
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

  /* ─── Mode switch ─── */
  const handleModeSwitch = async (mode: "barcode" | "label") => {
    if (mode === scanMode) return;

    if (mode === "label") {
      // Stop html5-qrcode, start raw camera stream for photo capture
      await stopBarcodeScanner();
      setScannerStarted(false);
      await startCameraStream();
    } else {
      // Stop raw camera stream, start html5-qrcode
      stopCameraStream();
      setScannerStarted(false);
      await startBarcodeScanner();
    }

    setScanMode(mode);
    setShowManual(false);
    setShowManualIngredientEntry(false);
    setNotFound(false);
    setLabelScanError(false);
  };

  const isTwoStepActive = photoScanStep !== "idle";

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {/* html5-qrcode renders its own video inside this div in barcode mode */}
      <div
        id="qr-reader"
        className="absolute inset-0 z-10"
        style={{
          // Hide html5-qrcode's default UI chrome but keep the video visible
          display: scanMode === "barcode" && !showManual ? "block" : "none",
        }}
      />

      {/* Raw video element for label scan / photo capture modes */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover z-10"
        style={{ display: scanMode === "label" || isTwoStepActive ? "block" : "none" }}
        playsInline
        muted
        autoPlay
        webkit-playsinline="true"
      />

      {/* Dark fallback when camera not started */}
      {!scannerStarted && (
        <div className="absolute inset-0 bg-[#0a0a0a]" />
      )}

      {showPulse && (
        <div className="absolute inset-0 z-[100] animate-scan-pulse bg-primary/40 pointer-events-none" />
      )}

      {(scanLoading || photoProcessing) && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black/60 pointer-events-none">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-white/80">
            {photoProcessing ? (photoProgress || "Reading label…") : "Identifying product…"}
          </p>
        </div>
      )}

      {/* Camera error overlay */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-[80]">
          <div className="text-center px-8">
            <Camera size={40} className="mx-auto text-white/30 mb-3" />
            <p className="text-sm text-white/70 mb-4">{cameraError}</p>
            <button
              onClick={async () => {
                setCameraError(null);
                autoStarted.current = false;
                await startScanner();
              }}
              className="rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary transition-colors active:bg-primary/30"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ─── Top bar: X button, wordmark, flashlight ─── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button
          onClick={() => isTwoStepActive ? cancelTwoStepFlow() : navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white transition-colors active:bg-black/50"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
        <span className="text-[15px] font-bold tracking-tight text-white drop-shadow-sm" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span>
        </span>
        <button
          onClick={() => setTorch(!torch)}
          disabled={!scannerStarted}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white transition-colors active:bg-black/50 disabled:opacity-30"
        >
          {torch ? <Flashlight size={20} strokeWidth={1.8} /> : <FlashlightOff size={20} strokeWidth={1.8} />}
        </button>
      </div>

      {/* ─── Two-Step Photo Scan Overlay ─── */}
      {isTwoStepActive ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center">
            <StepIndicator current={photoScanStep === "front" || photoScanStep === "front_captured" ? 1 : 2} />

            <p className="text-sm font-medium text-white drop-shadow-md mb-4 text-center px-8">
              {photoScanStep === "front" && "Take a photo of the front label"}
              {photoScanStep === "front_captured" && (
                <span className="text-primary flex items-center gap-1.5">
                  <Check size={16} /> Front label captured!
                </span>
              )}
              {photoScanStep === "ingredients" && "Now photograph the ingredients label"}
              {photoScanStep === "processing" && "Processing your photos…"}
            </p>

            {photoScanStep === "front" && scannerStarted && <FrontLabelOverlay />}
            {photoScanStep === "ingredients" && scannerStarted && <IngredientsOverlay />}

            {scannerStarted && !photoProcessing && (photoScanStep === "front" || photoScanStep === "ingredients") && (
              <button
                onClick={photoScanStep === "front" ? captureFrontPhoto : captureIngredientsPhoto}
                className="mt-5 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 backdrop-blur-sm text-white transition-all active:scale-95 active:bg-white/40"
                aria-label={photoScanStep === "front" ? "Capture front label" : "Capture ingredients"}
              >
                <Camera size={24} />
              </button>
            )}

            {photoScanStep === "front_captured" && (
              <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 border-4 border-primary backdrop-blur-sm">
                <Check size={28} className="text-primary" />
              </div>
            )}

            {!photoProcessing && (
              <button
                onClick={cancelTwoStepFlow}
                className="mt-4 text-xs text-white/50 underline underline-offset-2 transition-colors active:text-white/70"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─── Normal Scanner: Animated scan line + Bottom floating card ─── */
        <>
          {/* Animated green scanning line */}
          {scannerStarted && scanMode === "barcode" && (
            <div className="absolute inset-x-6 top-[30%] bottom-[35%] z-20 overflow-hidden pointer-events-none">
              <div
                className="absolute left-0 right-0 h-[2px] animate-scan-line"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, hsl(157, 70%, 45%) 20%, hsl(157, 70%, 50%) 50%, hsl(157, 70%, 45%) 80%, transparent 100%)",
                  boxShadow: "0 0 12px 2px hsla(157, 70%, 45%, 0.4)",
                }}
              />
            </div>
          )}

          {/* Label scan overlay — wrapped in error boundary */}
          {scanMode === "label" && !labelScanError && (
            <ScannerErrorBoundary
              fallback={
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rounded-2xl bg-black/70 px-6 py-4 text-center backdrop-blur-md">
                    <p className="text-sm text-white/80 mb-2">Label scan encountered an error</p>
                    <button
                      onClick={() => { setLabelScanError(false); void handleModeSwitch("barcode"); }}
                      className="text-xs text-primary underline"
                    >
                      Switch to barcode scan
                    </button>
                  </div>
                </div>
              }
              onError={() => setLabelScanError(true)}
            >
              <LabelScanContent
                scannerStarted={scannerStarted}
                photoProcessing={photoProcessing}
                capturePhoto={capturePhoto}
                showManualIngredientEntry={showManualIngredientEntry}
              />
            </ScannerErrorBoundary>
          )}

          {/* Label scan error recovery */}
          {scanMode === "label" && labelScanError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="rounded-2xl bg-black/70 px-6 py-4 text-center backdrop-blur-md">
                <p className="text-sm text-white/80 mb-2">Label scan encountered an error</p>
                <button
                  onClick={() => { setLabelScanError(false); }}
                  className="text-xs text-primary underline mr-3"
                >
                  Try again
                </button>
                <button
                  onClick={() => { setLabelScanError(false); void handleModeSwitch("barcode"); }}
                  className="text-xs text-white/50 underline"
                >
                  Switch to barcode
                </button>
              </div>
            </div>
          )}

          {/* ─── Bottom floating pill ─── */}
          <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40">
            <div
              className="rounded-2xl px-4 py-3 flex flex-col items-center gap-2"
              style={{
                background: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Mode toggle */}
              <div className="flex rounded-full border border-white/15 overflow-hidden">
                <button
                  onClick={() => void handleModeSwitch("barcode")}
                  className={`px-5 py-1.5 text-xs font-semibold transition-colors ${
                    scanMode === "barcode"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-white/60 active:text-white/80"
                  }`}
                >
                  Barcode
                </button>
                <button
                  onClick={() => void handleModeSwitch("label")}
                  className={`px-5 py-1.5 text-xs font-semibold transition-colors ${
                    scanMode === "label"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-white/60 active:text-white/80"
                  }`}
                >
                  Label Scan
                </button>
              </div>

              {/* Manual entry link */}
              <button
                onClick={() => {
                  if (scanMode === "barcode") {
                    setShowManual(true);
                    setNotFound(false);
                  } else {
                    setShowManualIngredientEntry(true);
                  }
                }}
                className="text-[11px] text-white/30 transition-colors active:text-white/50"
              >
                {scanMode === "barcode" ? "Enter barcode manually" : "Type ingredients manually"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Manual barcode entry panel */}
      {showManual && scanMode === "barcode" && !isTwoStepActive && (
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
            <NotFoundPanel
              barcode={barcode}
              manualIngredients={manualIngredients}
              setManualIngredients={setManualIngredients}
              handleManualIngredients={handleManualIngredients}
              onPhotoScan={startTwoStepPhotoScan}
            />
          )}
        </div>
      )}

      {/* Manual ingredient entry panel for label mode */}
      {showManualIngredientEntry && scanMode === "label" && !isTwoStepActive && (
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

      {/* Medium-confidence confirmation panel */}
      {pendingConfirmation && !isTwoStepActive && (
        <div className="animate-fade-in absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Confirm ingredients</h3>
            <button onClick={handleRetakePhoto} className="text-muted-foreground active:text-foreground">
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">We read this label — does this look right?</p>
          <textarea
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleConfirmIngredients}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors flex items-center justify-center gap-2">
              <Check size={16} /> Looks good
            </button>
            <button onClick={handleRetakePhoto}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors">
              Retake photo
            </button>
          </div>
        </div>
      )}

      {/* Blocked upgrade button */}
      {!showManual && !showManualIngredientEntry && !pendingConfirmation && !isTwoStepActive && blocked && (
        <div className="absolute inset-x-0 bottom-0 z-50 px-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
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
