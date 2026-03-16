import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Info } from "lucide-react";

interface Alternative {
  name: string;
  brand: string;
  score: number;
  reason: string;
}

const ALTERNATIVES: Alternative[] = [
  {
    name: "Siete Potato Chips",
    brand: "Siete",
    score: 82,
    reason: "Made with avocado oil. No seed oils or artificial additives.",
  },
  {
    name: "Jackson's Sweet Potato Chips",
    brand: "Jackson's",
    score: 79,
    reason: "Cooked in coconut oil with only three clean ingredients.",
  },
  {
    name: "Kettle Brand Avocado Oil Chips",
    brand: "Kettle Brand",
    score: 71,
    reason: "Uses avocado oil instead of canola. No artificial flavors.",
  },
];

const MiniScore = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {score}
      </span>
    </div>
  );
};

const AlternativeCard = ({ alt }: { alt: Alternative }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex gap-3 sm:gap-4">
      <MiniScore score={alt.score} />
      <div className="flex-1">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {alt.brand}
        </p>
        <h3 className="text-sm sm:text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {alt.name}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {alt.reason}
        </p>
      </div>
    </div>
    <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-colors active:bg-muted">
      <MapPin size={14} strokeWidth={2} />
      Find near me
    </button>
  </div>
);

const Alternatives = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6 px-5 sm:px-6">
        <h1
          className="text-lg font-semibold leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cleaner alternatives to{" "}
          <span className="text-primary">Lay's Classic Chips</span>
        </h1>

        {/* Cards */}
        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          {ALTERNATIVES.map((alt) => (
            <AlternativeCard key={alt.name} alt={alt} />
          ))}
        </div>

        {/* Source attribution */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Info size={13} strokeWidth={1.8} />
          Data sourced from Open Food Facts
        </div>
      </div>
    </div>
  );
};

export default Alternatives;
