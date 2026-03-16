import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flashlight, FlashlightOff } from "lucide-react";

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

const Scanner = () => {
  const navigate = useNavigate();
  const [torch, setTorch] = useState(false);

  const handleDemoScan = () => {
    navigate("/result", {
      state: {
        product: {
          name: "Lay's Classic Chips",
          brand: "Lay's",
          ingredients: [
            { name: "Potatoes", safe: true },
            { name: "Vegetable Oil (Sunflower, Corn, and/or Canola Oil)", safe: false, reason: "Contains seed oils" },
            { name: "Salt", safe: true },
          ],
          score: 45,
          verdict: "warning",
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0a]">
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
        {/* Scanning frame */}
        <div className="relative aspect-square w-full max-w-[260px]">
          <CornerBrackets />

          {/* Scan line */}
          <div className="absolute inset-x-3 inset-y-3 overflow-hidden">
            <div
              className="absolute left-0 right-0 h-[2px] animate-scan-line"
              style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 100%)",
                opacity: 0.7,
              }}
            />
          </div>

          {/* Dim overlay inside for depth */}
          <div className="absolute inset-0 rounded-sm bg-white/[0.02]" />
        </div>

        {/* Instructions */}
        <p className="mt-8 text-sm font-medium text-white/70">
          Point at any barcode
        </p>
        <button className="mt-2 text-xs text-white/40 underline underline-offset-2 transition-colors active:text-white/60">
          Enter barcode manually
        </button>
      </div>

      {/* Demo button */}
      <div className="px-6 pb-6 mb-[env(safe-area-inset-bottom)]">
        <button
          onClick={handleDemoScan}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors active:opacity-90"
        >
          Demo: Scan a product
        </button>
      </div>
    </div>
  );
};

export default Scanner;
