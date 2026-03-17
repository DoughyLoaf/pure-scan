import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";

const SLIDES = [
  { id: 0 },
  { id: 1 },
  { id: 2 },
] as const;

const ScoreRingPreview = () => {
  const score = 82;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
          82
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const FLAG_ROWS = [
  { name: "Seed Oils", badge: "Avoid" },
  { name: "Artificial Dyes", badge: "Avoid" },
  { name: "Preservatives", badge: "Avoid" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const complete = useCallback(
    (dest: string) => {
      localStorage.setItem("pure_onboarding_complete", "true");
      navigate(dest);
    },
    [navigate]
  );

  const goTo = (idx: number) => {
    setCurrent(Math.max(0, Math.min(idx, 2)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < 2) goTo(current + 1);
      if (diff < 0 && current > 0) goTo(current - 1);
    }
    setTouchStart(null);
  };

  // Keyboard nav for desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && current < 2) goTo(current + 1);
      if (e.key === "ArrowLeft" && current > 0) goTo(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current]);

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Skip button */}
      {current < 2 && (
        <button
          onClick={() => complete("/")}
          className="absolute right-5 top-5 z-10 text-sm font-medium text-muted-foreground transition-colors active:text-foreground"
        >
          Skip
        </button>
      )}

      {/* Slides container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${current * 100}vw)`,
          }}
        >
          {/* Slide 1 */}
          <div className="flex h-full flex-col items-center justify-center px-8" style={{ minWidth: "100vw" }}>
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent mb-6">
              <ScanLine className="text-primary" size={44} strokeWidth={1.6} />
            </div>
            <h2
              className="text-center text-2xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Know what's really
              <br />
              in your food
            </h2>
            <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
              Pure analyzes every ingredient and gives your food an honest score from 0 to 100.
            </p>
          </div>

          {/* Slide 2 */}
          <div className="flex h-full flex-col items-center justify-center px-8" style={{ minWidth: "100vw" }}>
            <div className="mb-6 w-full max-w-xs flex flex-col gap-3">
              {FLAG_ROWS.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {row.name}
                  </span>
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                    {row.badge}
                  </span>
                </div>
              ))}
            </div>
            <h2
              className="text-center text-2xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              We flag what matters
            </h2>
            <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
              No brand can pay to improve their rating. Our methodology is fully transparent.
            </p>
          </div>

          {/* Slide 3 */}
          <div className="flex h-full flex-col items-center justify-center px-8" style={{ minWidth: "100vw" }}>
            <div className="mb-6">
              <ScoreRingPreview />
            </div>
            <h2
              className="text-center text-2xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Start scanning for free
            </h2>
            <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
              Free users get 5 scans per day. No account needed. Start with anything in your kitchen.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom area: dots + button */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-6 px-6 pb-12">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {SLIDES.map((s) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                s.id === current ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        {current < 2 ? (
          <button
            onClick={() => goTo(current + 1)}
            className="w-full max-w-sm rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => complete("/scanner")}
            className="w-full max-w-sm rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
          >
            Start Scanning
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
