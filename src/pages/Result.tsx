import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, ChevronDown } from "lucide-react";

interface FlaggedIngredient {
  name: string;
  reason: string;
  labelText: string;
}

const DEMO_DATA = {
  name: "Lay's Classic Chips",
  brand: "Lay's",
  score: 34,
  flagged: [
    {
      name: "Canola Oil",
      reason: "A processed seed oil high in omega-6 fatty acids, linked to inflammation.",
      labelText: "Canola Oil",
    },
    {
      name: "Soybean Oil",
      reason: "A highly refined seed oil associated with oxidative stress and inflammatory responses.",
      labelText: "Soybean Oil",
    },
    {
      name: "Maltodextrin",
      reason: "A highly processed starch that spikes blood sugar faster than table sugar.",
      labelText: "Maltodextrin",
    },
    {
      name: "Artificial Flavor",
      reason: "A synthetic chemical blend with undisclosed compounds used to mimic natural taste.",
      labelText: "Natural and Artificial Flavor",
    },
  ] as FlaggedIngredient[],
};

const scoreColor = (score: number) => {
  if (score < 40) return { ring: "hsl(0, 72%, 51%)", label: "Poor" };
  if (score < 75) return { ring: "hsl(38, 92%, 50%)", label: "Fair" };
  return { ring: "hsl(var(--primary))", label: "Clean" };
};

const ScoreRing = ({ score }: { score: number }) => {
  const { ring, label } = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: ring }}>
            {score}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span
        className="mt-2 rounded-full px-3 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: ring + "18", color: ring }}
      >
        {label}
      </span>
    </div>
  );
};

const FlagCard = ({ ingredient }: { ingredient: FlaggedIngredient }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <h4 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {ingredient.name}
      </h4>
      <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
        Avoid
      </span>
    </div>
    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
      {ingredient.reason}
    </p>
    <div className="mt-3 rounded-lg bg-muted px-3 py-2">
      <p className="font-mono text-[12px] text-muted-foreground">
        {ingredient.labelText}
      </p>
    </div>
  </div>
);

const MethodologySection = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 w-full">
      <button
        onClick={() => setOpen(!open)}
        className="mx-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors active:text-foreground"
      >
        How we score this
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="mt-3 animate-fade-in space-y-2.5 rounded-2xl border border-border bg-card px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            We flag seed oils: canola, soybean, sunflower, corn, cottonseed.
          </li>
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            We flag artificial additives: dyes, preservatives, sweeteners.
          </li>
          <li className="flex gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Scores are based purely on ingredients. No brand can pay to improve their rating.
          </li>
        </ul>
      )}
    </div>
  );
};

const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use passed state or fall back to demo data
  const data = DEMO_DATA;

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
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted">
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Product Info + Score */}
      <div className="mt-6 flex flex-col items-center px-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {data.brand}
        </p>
        <h1
          className="mt-1 text-center text-xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.name}
        </h1>
        <div className="mt-6">
          <ScoreRing score={data.score} />
        </div>

        {/* Methodology expander */}
        <MethodologySection />
      </div>

      {/* Flagged Ingredients */}
      <div className="mt-10 px-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Why this score?
        </h3>
        <div className="flex flex-col gap-3">
          {data.flagged.map((ing) => (
            <FlagCard key={ing.name} ingredient={ing} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+68px)] pt-4">
        <button
          onClick={() => navigate("/alternatives")}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors active:opacity-90"
        >
          See clean alternatives
        </button>
      </div>
    </div>
  );
};

export default Result;
