import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, ChevronDown, Info, X, ScanLine, Leaf } from "lucide-react";
import { isPro, getScansRemaining, FREE_DAILY_LIMIT_VALUE } from "@/lib/scan-limits";
import type { ProductResult, FlaggedIngredient } from "@/lib/scoring";
import ResultSkeleton from "@/components/ResultSkeleton";
import { toast } from "@/hooks/use-toast";

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
            className="animate-ring-draw"
            style={{
              "--ring-circumference": `${circumference}`,
              "--ring-offset": `${offset}`,
            } as React.CSSProperties}
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

const PREF_CATEGORY_MAP: Record<string, string> = {
  "seed-oils": "Seed Oil",
  "artificial-dyes": "Artificial Dye",
  "artificial-sweeteners": "Artificial Sweetener",
  "preservatives": "Preservative",
  "added-sugars": "Added Sugar",
  "emulsifiers": "Emulsifier",
};

const getUserFlaggedCategories = (): Set<string> => {
  try {
    const prefs: string[] = JSON.parse(localStorage.getItem("pure_dietary_prefs") || "[]");
    return new Set(prefs.map((id) => PREF_CATEGORY_MAP[id]).filter(Boolean));
  } catch {
    return new Set();
  }
};

const getRiskLevel = (category: string): { label: string; color: string; bg: string } => {
  switch (category) {
    case "Seed Oil":
    case "Artificial Sweetener":
      return { label: "High Risk", color: "hsl(0, 72%, 51%)", bg: "hsl(0, 72%, 51%, 0.1)" };
    case "Preservative":
    case "Artificial Dye":
    case "Added Sugar":
      return { label: "Medium Risk", color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 50%, 0.1)" };
    case "Emulsifier":
      return { label: "Medium Risk", color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 50%, 0.1)" };
    case "Ultra-Processed":
      return { label: "Low-Medium", color: "hsl(48, 80%, 50%)", bg: "hsl(48, 80%, 50%, 0.1)" };
    default:
      return { label: "Low-Medium", color: "hsl(48, 80%, 50%)", bg: "hsl(48, 80%, 50%, 0.1)" };
  }
};

const LEARN_MORE: Record<string, string[]> = {
  "Canola Oil": [
    "High in omega-6 fatty acids which compete with anti-inflammatory omega-3s.",
    "Undergoes heavy chemical processing including deodorization at high temperatures.",
    "Studies link excess omega-6 consumption to chronic inflammatory conditions.",
  ],
  "Soybean Oil": [
    "Contains roughly 54% omega-6 linoleic acid, one of the highest among cooking oils.",
    "Animal studies show it may affect gene expression related to obesity and diabetes.",
    "Often extracted using hexane, a petroleum-derived chemical solvent.",
  ],
  "Sunflower Oil": [
    "Contains up to 65% omega-6 fatty acids, promoting an inflammatory imbalance.",
    "High heat processing creates oxidized lipids linked to cardiovascular damage.",
    "Widely used in processed foods due to its low cost, not its health benefits.",
  ],
  "Corn Oil": [
    "Omega-6 to omega-3 ratio can exceed 40:1, far from the ideal 4:1 or lower.",
    "Predominantly sourced from genetically modified corn crops.",
    "Refining process strips away naturally occurring antioxidants and nutrients.",
  ],
  "Cottonseed Oil": [
    "Derived from cotton, a crop heavily treated with pesticides not intended for food use.",
    "Contains cyclopropenoid fatty acids which may interfere with fatty acid metabolism.",
    "Historically classified as industrial waste before being repurposed for food processing.",
  ],
  "Vegetable Oil": [
    "Typically a blend of soybean, corn, and canola oils high in omega-6.",
    "The generic label obscures what specific oils are actually used.",
    "Undergoes extensive refining that removes nutrients and creates trans fat traces.",
  ],
  "Rapeseed Oil": [
    "Canola is a cultivar of rapeseed bred to reduce erucic acid content.",
    "Processing involves high heat and chemical solvents that degrade beneficial compounds.",
    "Studies show high omega-6 intake from seed oils correlates with increased inflammation markers.",
  ],
  "Red 40": [
    "Derived from petroleum; banned or restricted in several European countries.",
    "Multiple studies link it to hyperactivity and behavioral issues in children.",
    "The Center for Science in the Public Interest has petitioned for its ban since 2008.",
  ],
  "Yellow 5": [
    "One of the most commonly used artificial dyes in the United States.",
    "Requires a warning label in the EU due to links to childhood hyperactivity.",
    "May cause allergic-type reactions, particularly in aspirin-sensitive individuals.",
  ],
  "Yellow 6": [
    "Petroleum-derived dye that has been linked to adrenal tumors in animal studies.",
    "Requires a hyperactivity warning label on foods sold in the European Union.",
    "Commonly found in snacks, cereals, and beverages marketed to children.",
  ],
  "Blue 1": [
    "Can cross the blood-brain barrier, raising concerns about neurological effects.",
    "Limited long-term safety data available despite widespread use.",
    "Has been shown to cause chromosomal damage in some in-vitro studies.",
  ],
  "Blue 2": [
    "Derived from synthetic indigo and linked to brain tumors in male rats.",
    "Used primarily in candies, beverages, and pet foods.",
    "The European Food Safety Authority has called for further safety evaluations.",
  ],
  "Red 3": [
    "Banned in cosmetics by the FDA in 1990 due to thyroid tumor links, but still allowed in food.",
    "California signed a law in 2023 to ban Red 3 in food by 2027.",
    "Acts as a xenoestrogen, potentially disrupting hormonal balance.",
  ],
  "Green 3": [
    "One of the least studied synthetic dyes currently permitted in food.",
    "Animal studies have shown links to bladder and testes tumors.",
    "Rarely used but still present in some candies and beverages.",
  ],
  "BHA": [
    "Classified as 'reasonably anticipated to be a human carcinogen' by the National Toxicology Program.",
    "Acts as an endocrine disruptor, potentially affecting thyroid and reproductive hormones.",
    "Banned as a food additive in Japan and restricted in the EU.",
  ],
  "BHT": [
    "Structurally similar to BHA with comparable endocrine-disrupting concerns.",
    "Can accumulate in body fat and organs with prolonged exposure.",
    "Some studies link it to developmental and behavioral effects in animal models.",
  ],
  "TBHQ": [
    "Derived from butane; the FDA limits its concentration to 0.02% of oil content.",
    "Studies suggest it may impair immune response to infections and vaccines.",
    "Linked to vision disturbances and liver enlargement at higher doses in animal studies.",
  ],
  "Sodium Benzoate": [
    "When combined with ascorbic acid (vitamin C), can form benzene—a known carcinogen.",
    "Has been shown to increase hyperactivity in children in combination with artificial colors.",
    "May damage mitochondrial DNA according to research from the University of Sheffield.",
  ],
  "Potassium Sorbate": [
    "In vitro studies show it can be genotoxic to human lymphocytes at high concentrations.",
    "Generally recognized as safe at low levels, but cumulative exposure is a concern.",
    "May cause skin and respiratory allergic reactions in sensitive individuals.",
  ],
  "Aspartame": [
    "Classified as 'possibly carcinogenic to humans' (Group 2B) by IARC in 2023.",
    "Breaks down into phenylalanine, aspartic acid, and methanol during digestion.",
    "Some studies suggest it may disrupt gut microbiome composition and glucose tolerance.",
  ],
  "Sucralose": [
    "Research indicates it may reduce beneficial gut bacteria by up to 50%.",
    "Heating sucralose can produce chloropropanols, a potentially toxic compound class.",
    "Despite being marketed as 'made from sugar,' it undergoes extensive chemical chlorination.",
  ],
  "Saccharin": [
    "Was nearly banned in the 1970s after studies linked it to bladder cancer in rats.",
    "More recent research suggests it may alter gut microbiome composition.",
    "500 times sweeter than sugar, which may condition preference for intensely sweet tastes.",
  ],
  "Acesulfame Potassium": [
    "Contains methylene chloride, a potential carcinogen, as a processing solvent.",
    "Often used in combination with other artificial sweeteners to mask bitter aftertaste.",
    "Limited independent long-term studies exist; most safety data comes from manufacturer-funded research.",
  ],
  "Maltodextrin": [
    "Has a glycemic index of 85–105, often higher than pure table sugar (65).",
    "May suppress the growth of beneficial gut probiotics while promoting harmful bacteria.",
    "Commonly derived from genetically modified corn through enzymatic processing.",
  ],
  "Carrageenan": [
    "The Cornucopia Institute petitioned the FDA to ban it from food due to inflammatory effects.",
    "Even food-grade carrageenan may degrade to carcinogenic poligeenan during digestion.",
    "Widely used as a thickener in plant-based milks, deli meats, and infant formula.",
  ],
  "Modified Starch": [
    "Chemically or enzymatically treated to change texture, stability, or digestibility.",
    "Some modifications involve propylene oxide or hydrochloric acid treatment.",
    "Heavily processed variants may spike blood sugar similarly to refined sugars.",
  ],
  "Artificial Flavor": [
    "A single 'artificial flavor' can contain dozens of undisclosed chemical compounds.",
    "Manufacturers are not required to disclose the specific chemicals used.",
    "Designed to create hyper-palatable taste profiles that may encourage overconsumption.",
  ],
  "Natural Flavor": [
    "Can contain up to 100 different chemicals including solvents and preservatives.",
    "The 'natural' label only requires the source to be plant, animal, or mineral-derived.",
    "Often as heavily processed as artificial flavors despite the healthier-sounding name.",
  ],
  // Added Sugars
  "High Fructose Corn Syrup": [
    "Metabolized primarily by the liver, contributing to non-alcoholic fatty liver disease.",
    "Bypasses normal satiety signals, promoting overconsumption and weight gain.",
    "Linked to increased uric acid levels, raising risk of gout and cardiovascular disease.",
  ],
  "Corn Syrup": [
    "A liquid sweetener with a high glycemic index that rapidly elevates blood sugar.",
    "Often used to add bulk and moisture to ultra-processed foods at low cost.",
    "Provides empty calories with no vitamins, minerals, or fiber.",
  ],
  "Dextrose": [
    "A simple sugar (glucose) with a glycemic index near 100, one of the highest possible.",
    "Rapidly absorbed, causing sharp insulin spikes that promote fat storage.",
    "Commonly added to processed meats, snacks, and baked goods as a hidden sugar source.",
  ],
  "Glucose Syrup": [
    "Industrially produced by breaking down starch using acids or enzymes.",
    "Contributes to rapid blood sugar spikes and subsequent energy crashes.",
    "Often combined with fructose syrup in processed foods to enhance sweetness cheaply.",
  ],
  "Invert Sugar": [
    "Processed with acids or enzymes to break sucrose into glucose and fructose.",
    "Absorbed more rapidly than regular sugar, intensifying metabolic impact.",
    "Used in confections and beverages to prevent crystallization and enhance sweetness.",
  ],
  "Cane Sugar": [
    "Despite its 'natural' image, refined cane sugar offers no nutritional advantage over white sugar.",
    "Excessive intake is strongly linked to obesity, type 2 diabetes, and heart disease.",
    "The WHO recommends limiting added sugars to less than 10% of daily caloric intake.",
  ],
  // Emulsifiers
  "Polysorbate 80": [
    "Animal studies show it erodes the protective mucus lining of the gut.",
    "Linked to increased intestinal permeability ('leaky gut') and low-grade inflammation.",
    "May promote conditions like colitis and metabolic syndrome according to Georgia State University research.",
  ],
  "Carboxymethylcellulose": [
    "Studies show it alters gut microbiome composition and promotes bacterial overgrowth.",
    "Linked to intestinal inflammation and metabolic syndrome in mouse models.",
    "Used as a thickener in ice cream, sauces, and gluten-free baked goods.",
  ],
  "Soy Lecithin": [
    "Extracted from soybean oil using chemical solvents, predominantly from GMO soybeans.",
    "While generally considered safe in small amounts, cumulative exposure is poorly studied.",
    "Can cause reactions in individuals with soy allergies despite being highly processed.",
  ],
  "Mono and Diglycerides": [
    "May contain trans fats that are exempt from labeling requirements on nutrition panels.",
    "Produced through industrial glycerolysis of fats, often from hydrogenated oils.",
    "Found in nearly every category of processed food from bread to ice cream.",
  ],
  "Sodium Stearoyl Lactylate": [
    "A synthetic emulsifier made from stearic acid and lactic acid.",
    "Commonly used in commercial bread to improve texture and extend shelf life.",
    "Limited independent research exists on long-term effects of daily consumption.",
  ],
  "DATEM": [
    "One of the most common dough conditioners in commercial bread production.",
    "Made by esterifying tartaric acid with mono- and diglycerides of fatty acids.",
    "Some studies raise concerns about potential heart muscle scarring at high doses in animals.",
  ],
  // Additional Ultra-Processed
  "Sodium Nitrite": [
    "Forms nitrosamines—potent carcinogens—when exposed to high heat during cooking.",
    "The WHO classifies processed meats containing nitrites as Group 1 carcinogens.",
    "Used primarily in bacon, hot dogs, and deli meats to preserve color and inhibit bacteria.",
  ],
  "Titanium Dioxide": [
    "Banned as a food additive in the European Union since 2022 due to genotoxicity concerns.",
    "Nanoparticles may accumulate in organs and cross the blood-brain barrier.",
    "Used purely for cosmetic whitening in candies, frosting, and chewing gum.",
  ],
};

const getLearnMore = (name: string): string[] => {
  return LEARN_MORE[name] || [
    "This ingredient has been flagged due to potential health concerns.",
    "Research suggests limiting consumption of ultra-processed additives.",
    "Check independent sources for the latest safety assessments.",
  ];
};

const FlagCard = ({ ingredient, flaggedCategories }: { ingredient: FlaggedIngredient; flaggedCategories: Set<string> }) => {
  const isFlaggedForUser = flaggedCategories.has(ingredient.category);
  const [expanded, setExpanded] = useState(false);
  const risk = getRiskLevel(ingredient.category);
  const learnMore = getLearnMore(ingredient.name);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left rounded-2xl border border-border bg-card p-4 transition-colors active:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {ingredient.name}
          </h4>
          <span className="mt-0.5 inline-block text-[11px] font-medium text-muted-foreground">
            {ingredient.category}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {isFlaggedForUser && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Flagged for you
              </span>
            )}
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: risk.bg, color: risk.color }}
            >
              {risk.label}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-destructive">
            −{ingredient.deduction} pts
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {ingredient.reason}
      </p>
      <div className="mt-3 rounded-lg bg-muted px-3 py-2">
        <p className="font-mono text-[12px] text-muted-foreground">
          {ingredient.labelText}
        </p>
      </div>

      {/* Expandable detail section */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? "400px" : "0px",
          opacity: expanded ? 1 : 0,
          marginTop: expanded ? "12px" : "0px",
        }}
      >
        <div className="border-t border-border pt-3 space-y-3">
          {/* Risk Level Badge */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: risk.bg, color: risk.color }}
            >
              {risk.label}
            </span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="text-muted-foreground rotate-180 transition-transform"
            />
          </div>

          {/* Learn More Bullets */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Learn more
            </p>
            <ul className="space-y-1.5">
              {learnMore.map((point, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Source line */}
          <p className="text-[11px] text-muted-foreground/60 italic">
            Based on peer-reviewed research
          </p>
        </div>
      </div>
    </button>
  );
};

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
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: open ? "300px" : "0px",
          opacity: open ? 1 : 0,
          marginTop: open ? "12px" : "0px",
        }}
      >
        <ul className="space-y-2.5 rounded-2xl border border-border bg-card px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">
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
      </div>
    </div>
  );
};

const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-20 w-20 shrink-0 rounded-2xl border border-border overflow-hidden bg-muted">
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

const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [ready, setReady] = useState(false);
  const [scansRemaining, setScansRemaining] = useState<number>(FREE_DAILY_LIMIT_VALUE);
  const [flaggedCategories] = useState(() => getUserFlaggedCategories());

  const locationState = location.state as { product?: ProductResult } | null;
  const data = locationState?.product ?? DEMO_DATA;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const remaining = getScansRemaining();
    setScansRemaining(remaining);
    if (!isPro() && remaining < FREE_DAILY_LIMIT_VALUE) {
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!ready) return <ResultSkeleton />;

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
        <button
          onClick={async () => {
            const flaggedCount = data.flagged.length;
            const firstName = flaggedCount > 0 ? data.flagged[0].name : "";
            const shareText = `${data.name} scored ${data.score}/100 on Pure. ${flaggedCount} ingredient${flaggedCount === 1 ? "" : "s"} flagged${firstName ? ` including ${firstName}` : ""}. Check what's in your food 👇`;
            const shareData = {
              title: `Pure Score — ${data.name}`,
              text: shareText,
              url: "https://getpure.app",
            };
            if (navigator.share) {
              try { await navigator.share(shareData); } catch {}
            } else {
              try {
                await navigator.clipboard.writeText(`${shareText} https://getpure.app`);
                toast({ title: "Copied to clipboard" });
              } catch {}
            }
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Product Info + Score */}
      <div className="mt-6 flex flex-col items-center px-6">
        <div className="flex items-center gap-4 w-full justify-center">
          {data.imageUrl ? (
            <ProductImage src={data.imageUrl} alt={data.name} />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted">
              <Leaf size={28} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {data.brand}
            </p>
            <h1
              className="mt-1 text-lg font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.name}
            </h1>
          </div>
        </div>
        <div className="mt-6">
          <ScoreRing score={data.score} />
        </div>

        <MethodologySection />
      </div>

      {/* Missing ingredients notice */}
      {data.ingredientsRaw.trim() === "" && (
        <div className="mx-6 mt-6 flex items-start gap-2.5 rounded-2xl border border-border bg-accent/50 px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" strokeWidth={2} />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">No ingredient data available.</span>{" "}
            This product's score may be incomplete. The database doesn't have an ingredient list for this item yet.
          </p>
        </div>
      )}

      <div className="mt-10 px-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Score breakdown
        </h3>
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Starting score</span>
            <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>100</span>
          </div>
          {data.flagged.map((ing) => (
            <div key={ing.name} className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{ing.name}</span>
              <span className="font-semibold text-destructive">−{ing.deduction}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-border pt-3 flex items-center justify-between text-sm">
            <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Pure Score</span>
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)", color: scoreColor(data.score).ring }}>{data.score}</span>
          </div>
        </div>

        {/* Risk summary */}
        {(() => {
          const counts = { high: 0, medium: 0, low: 0 };
          data.flagged.forEach((ing) => {
            const r = getRiskLevel(ing.category);
            if (r.label === "High Risk") counts.high++;
            else if (r.label === "Medium Risk") counts.medium++;
            else counts.low++;
          });
          const pills: { label: string; count: number; color: string; bg: string }[] = [];
          if (counts.high) pills.push({ label: "High Risk", count: counts.high, color: "hsl(0, 72%, 51%)", bg: "hsl(0, 72%, 51%, 0.1)" });
          if (counts.medium) pills.push({ label: "Medium Risk", count: counts.medium, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 50%, 0.1)" });
          if (counts.low) pills.push({ label: "Low-Medium", count: counts.low, color: "hsl(48, 80%, 50%)", bg: "hsl(48, 80%, 50%, 0.1)" });
          return pills.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {pills.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                  style={{ backgroundColor: p.bg, color: p.color }}
                >
                  <span className="font-bold">{p.count}</span> {p.label}
                </span>
              ))}
            </div>
          ) : null;
        })()}

        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Why this score?
        </h3>
        <div className="flex flex-col gap-3">
          {data.flagged.map((ing) => (
            <FlagCard key={ing.name} ingredient={ing} flaggedCategories={flaggedCategories} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+68px)] pt-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/scanner")}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3.5 text-sm font-semibold text-foreground transition-colors active:bg-muted"
          >
            <ScanLine size={18} strokeWidth={2} />
            Scan another
          </button>
          <button
            onClick={() => navigate("/alternatives", { state: { product: data } })}
            className="flex-1 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors"
          >
            See clean alternatives
          </button>
        </div>
      </div>

      {/* Remaining scans banner */}
      {showBanner && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+120px)] z-[60] px-4 animate-fade-in">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                You're on Pure Free
              </p>
              <p className="text-[12px] text-muted-foreground">
                {scansRemaining === 0
                  ? "No scans left today"
                  : `${scansRemaining} scan${scansRemaining === 1 ? "" : "s"} left today`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/paywall")}
                className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
              >
                Upgrade
              </button>
              <button onClick={() => setShowBanner(false)} className="text-muted-foreground active:text-foreground">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Result;
