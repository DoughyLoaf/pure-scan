import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Info, ScanLine, Droplets, CheckCircle2, Minus, ChevronRight } from "lucide-react";
import type { ProductResult } from "@/lib/scoring";
import { WATER_DATABASE } from "@/lib/water-database";
import type { WaterBrand } from "@/lib/water-database";

interface Alternative {
  name: string;
  brand: string;
  score: number;
  reason: string;
}

// ── Category inference from product name ───────────────────────────
function inferCategory(name: string, brand?: string): string {
  const n = (name + " " + (brand || "")).toLowerCase();
  if (/energy|monster|red\s*bull|celsius|bang|reign|rockstar|g\s*fuel|zoa/i.test(n)) return "energy drinks";
  if (/frozen\s*(meal|dinner|entrée|entree|pizza|burrito)|lean\s*cuisine|stouffer|amy.*kitchen|hot\s*pocket/i.test(n)) return "frozen meals";
  if (/peanut\s*butter|almond\s*butter|nut\s*butter|sun\s*butter|cashew\s*butter/i.test(n)) return "peanut butter";
  if (/dressing|vinaigrette|ranch|caesar/i.test(n)) return "salad dressing";
  if (/cooking\s*oil|olive\s*oil|avocado\s*oil|coconut\s*oil|canola|vegetable\s*oil/i.test(n)) return "cooking oil";
  if (/chip|crisp|frito|dorito|cheeto/i.test(n)) return "chips";
  if (/cereal|granola|flake|crunch|cheerio|loop|oatmeal/i.test(n)) return "cereal";
  if (/cracker|pretzel|goldfish/i.test(n)) return "crackers";
  if (/yogurt|yoghurt|kefir/i.test(n)) return "yogurt";
  if (/soda|cola|pop|sprite|fanta|dew/i.test(n)) return "soda";
  if (/juice/i.test(n)) return "juice";
  if (/cookie|oreo|biscuit/i.test(n)) return "cookies";
  if (/candy|gumm|skittle|starburst|sour/i.test(n)) return "candy";
  if (/ice\s*cream|gelato/i.test(n)) return "ice cream";
  if (/bread|bun|bagel|muffin|toast|tortilla|wrap/i.test(n)) return "bread";
  if (/sauce|ketchup|mustard|mayo|bbq/i.test(n)) return "sauce";
  if (/bar|cliff|kind|rxbar|protein\s*bar|granola\s*bar|snack\s*bar/i.test(n)) return "bars";
  if (/noodle|ramen|pasta|mac.*cheese/i.test(n)) return "noodles";
  if (/milk|oat.*milk|almond.*milk/i.test(n)) return "milk";
  if (/chocolate|cocoa|hazelnut|nutella|spread/i.test(n)) return "chocolate";
  if (/popcorn/i.test(n)) return "popcorn";
  if (/frozen/i.test(n)) return "frozen meals";
  return "snack";
}

// ── Alternatives database by category × flagged concern ────────────
type AltDB = Record<string, Record<string, Alternative[]>>;

const ALT_DB: AltDB = {
  chips: {
    "Seed Oil": [
      { name: "Siete Potato Chips", brand: "Siete", score: 82, reason: "Made with avocado oil instead of canola or sunflower oil." },
      { name: "Jackson's Sweet Potato Chips", brand: "Jackson's", score: 79, reason: "Cooked in coconut oil with only three clean ingredients." },
      { name: "Kettle Brand Avocado Oil Chips", brand: "Kettle Brand", score: 71, reason: "Uses avocado oil instead of canola with no artificial flavors." },
    ],
    "Ultra-Processed": [
      { name: "Boulder Canyon Chips", brand: "Boulder Canyon", score: 78, reason: "Simple ingredient list with avocado oil and sea salt." },
      { name: "Terra Vegetable Chips", brand: "Terra", score: 74, reason: "Real vegetables with minimal processing and no artificial flavors." },
      { name: "Good Health Avocado Oil Chips", brand: "Good Health", score: 76, reason: "Clean label with avocado oil and natural seasonings." },
    ],
    _default: [
      { name: "Siete Potato Chips", brand: "Siete", score: 82, reason: "Made with avocado oil instead of canola or sunflower oil." },
      { name: "Jackson's Sweet Potato Chips", brand: "Jackson's", score: 79, reason: "Cooked in coconut oil with only three clean ingredients." },
      { name: "Boulder Canyon Chips", brand: "Boulder Canyon", score: 78, reason: "Simple ingredient list with avocado oil and sea salt." },
    ],
  },
  cereal: {
    "Artificial Dye": [
      { name: "Nature's Path Organic Sunrise", brand: "Nature's Path", score: 85, reason: "USDA Organic with no synthetic dyes, colors, or sweeteners." },
      { name: "Cascadian Farm Organic Granola", brand: "Cascadian Farm", score: 82, reason: "Whole grain oats with no synthetic colors or flavors." },
      { name: "Barbara's Puffins", brand: "Barbara's", score: 79, reason: "No artificial dyes, preservatives, or high-fructose corn syrup." },
    ],
    "Artificial Sweetener": [
      { name: "Ezekiel 4:9 Sprouted Cereal", brand: "Food For Life", score: 89, reason: "Sprouted grains with no added sugar or artificial sweeteners." },
      { name: "Nature's Path Heritage Flakes", brand: "Nature's Path", score: 84, reason: "Naturally sweetened with organic cane sugar, no artificial sweeteners." },
      { name: "One Degree Sprouted Oat O's", brand: "One Degree", score: 82, reason: "Sprouted oats with minimal sweetening and full ingredient traceability." },
    ],
    _default: [
      { name: "Nature's Path Organic Sunrise", brand: "Nature's Path", score: 85, reason: "USDA Organic with no synthetic dyes, colors, or sweeteners." },
      { name: "Ezekiel 4:9 Sprouted Cereal", brand: "Food For Life", score: 89, reason: "Sprouted grains with no added sugar or preservatives." },
      { name: "Cascadian Farm Organic Granola", brand: "Cascadian Farm", score: 82, reason: "Whole grain oats with no synthetic colors or flavors." },
    ],
  },
  crackers: {
    _default: [
      { name: "Simple Mills Almond Flour Crackers", brand: "Simple Mills", score: 84, reason: "Grain-free with clean ingredients and no seed oils." },
      { name: "Mary's Gone Crackers", brand: "Mary's Gone", score: 81, reason: "Organic whole grain, gluten-free, and no artificial additives." },
      { name: "Hu Kitchen Grain-Free Crackers", brand: "Hu Kitchen", score: 79, reason: "Paleo-friendly with cassava flour and no seed oils." },
    ],
  },
  yogurt: {
    _default: [
      { name: "Siggi's Icelandic Yogurt", brand: "Siggi's", score: 88, reason: "Simple ingredients with high protein, low sugar, and no additives." },
      { name: "Stonyfield Organic Whole Milk Yogurt", brand: "Stonyfield", score: 85, reason: "USDA Organic with no artificial flavors, colors, or sweeteners." },
      { name: "Fage Total Plain Greek Yogurt", brand: "Fage", score: 87, reason: "Only milk and live cultures — zero additives or preservatives." },
    ],
  },
  soda: {
    _default: [
      { name: "Olipop Vintage Cola", brand: "Olipop", score: 78, reason: "Prebiotic soda with natural sweeteners and no artificial dyes." },
      { name: "Poppi Prebiotic Soda", brand: "Poppi", score: 75, reason: "Apple cider vinegar based with natural fruit flavors." },
      { name: "Zevia Zero Calorie Soda", brand: "Zevia", score: 72, reason: "Sweetened with stevia instead of artificial sweeteners." },
    ],
  },
  "energy drinks": {
    "Artificial Sweetener": [
      { name: "Celsius Live Fit", brand: "Celsius", score: 72, reason: "Sweetened with sucralose-free formula using stevia and erythritol." },
      { name: "Guayakí Yerba Mate", brand: "Guayakí", score: 82, reason: "Organic yerba mate with natural caffeine and no artificial sweeteners." },
      { name: "Hiball Organic Energy Water", brand: "Hiball", score: 79, reason: "USDA Organic with zero sugar and no artificial sweeteners or dyes." },
    ],
    "Artificial Dye": [
      { name: "RUNA Clean Energy", brand: "RUNA", score: 80, reason: "Brewed from guayusa leaves with no artificial dyes or flavors." },
      { name: "Matchabar Hustle Matcha Energy", brand: "Matchabar", score: 77, reason: "Matcha-based energy with natural color and no synthetic dyes." },
      { name: "Guayakí Yerba Mate", brand: "Guayakí", score: 82, reason: "Organic yerba mate with naturally derived color and caffeine." },
    ],
    _default: [
      { name: "Guayakí Yerba Mate", brand: "Guayakí", score: 82, reason: "Organic yerba mate with natural caffeine and no artificial additives." },
      { name: "Hiball Organic Energy Water", brand: "Hiball", score: 79, reason: "USDA Organic sparkling energy with zero sugar and no dyes." },
      { name: "RUNA Clean Energy", brand: "RUNA", score: 80, reason: "Brewed from guayusa leaves with no artificial colors or sweeteners." },
    ],
  },
  "frozen meals": {
    "Seed Oil": [
      { name: "Amy's Organic Mexican Casserole", brand: "Amy's Kitchen", score: 76, reason: "Made with organic ingredients and no seed oils or preservatives." },
      { name: "Saffron Road Chicken Tikka Masala", brand: "Saffron Road", score: 73, reason: "Antibiotic-free chicken cooked without canola or soybean oil." },
      { name: "Primal Kitchen Frozen Bowl", brand: "Primal Kitchen", score: 78, reason: "Paleo-friendly with avocado oil and no seed oils." },
    ],
    "Preservative": [
      { name: "Daily Harvest Flatbread", brand: "Daily Harvest", score: 81, reason: "Plant-based with no preservatives, just whole frozen vegetables." },
      { name: "Tattooed Chef Plant-Based Bowl", brand: "Tattooed Chef", score: 74, reason: "Simple plant ingredients with no synthetic preservatives." },
      { name: "Amy's Organic Light & Lean", brand: "Amy's Kitchen", score: 76, reason: "USDA Organic frozen entrée with no artificial preservatives." },
    ],
    _default: [
      { name: "Amy's Organic Mexican Casserole", brand: "Amy's Kitchen", score: 76, reason: "Made with organic ingredients and no seed oils or preservatives." },
      { name: "Primal Kitchen Frozen Bowl", brand: "Primal Kitchen", score: 78, reason: "Paleo-friendly with avocado oil and clean protein sources." },
      { name: "Daily Harvest Flatbread", brand: "Daily Harvest", score: 81, reason: "Plant-based with no preservatives, just whole frozen vegetables." },
    ],
  },
  bars: {
    "Seed Oil": [
      { name: "RXBAR Chocolate Sea Salt", brand: "RXBAR", score: 86, reason: "Egg whites, dates, nuts, and cocoa — no seed oils or fillers." },
      { name: "Larabar Apple Pie", brand: "Larabar", score: 88, reason: "Only dates, almonds, and apples with no oils added." },
      { name: "That's It Apple + Mango Bar", brand: "That's It", score: 89, reason: "Two ingredients: real fruit pressed into a bar, nothing else." },
    ],
    "Artificial Sweetener": [
      { name: "KIND Dark Chocolate Nuts & Sea Salt", brand: "KIND", score: 76, reason: "Whole nuts with dark chocolate and no artificial sweeteners." },
      { name: "GoMacro MacroBar", brand: "GoMacro", score: 80, reason: "Organic plant-based bar sweetened with brown rice syrup, not sucralose." },
      { name: "RXBAR Peanut Butter", brand: "RXBAR", score: 85, reason: "Sweetened only by dates with no artificial sweeteners." },
    ],
    _default: [
      { name: "RXBAR Chocolate Sea Salt", brand: "RXBAR", score: 86, reason: "Egg whites, dates, nuts, and cocoa — no additives at all." },
      { name: "Larabar Apple Pie", brand: "Larabar", score: 88, reason: "Only dates, almonds, and apples with nothing artificial." },
      { name: "KIND Dark Chocolate Nuts & Sea Salt", brand: "KIND", score: 76, reason: "Whole nuts with dark chocolate and no artificial sweeteners." },
    ],
  },
  "peanut butter": {
    "Seed Oil": [
      { name: "Once Again Organic Peanut Butter", brand: "Once Again", score: 89, reason: "Just dry-roasted organic peanuts and salt — no palm or seed oils." },
      { name: "Teddie All Natural Peanut Butter", brand: "Teddie", score: 86, reason: "Only peanuts and salt, no hydrogenated oils or added sugar." },
      { name: "Santa Cruz Organic Peanut Butter", brand: "Santa Cruz", score: 84, reason: "USDA Organic with only roasted peanuts — zero seed oils." },
    ],
    _default: [
      { name: "Once Again Organic Peanut Butter", brand: "Once Again", score: 89, reason: "Just dry-roasted organic peanuts and salt — no palm or seed oils." },
      { name: "Teddie All Natural Peanut Butter", brand: "Teddie", score: 86, reason: "Only peanuts and salt, no hydrogenated oils or added sugar." },
      { name: "Santa Cruz Organic Peanut Butter", brand: "Santa Cruz", score: 84, reason: "USDA Organic with only roasted peanuts — zero added oils." },
    ],
  },
  "salad dressing": {
    "Seed Oil": [
      { name: "Primal Kitchen Caesar Dressing", brand: "Primal Kitchen", score: 84, reason: "Made with avocado oil instead of canola or soybean oil." },
      { name: "Tessemae's Organic Ranch", brand: "Tessemae's", score: 81, reason: "Cold-pressed organic sunflower oil base with no canola oil." },
      { name: "Sir Kensington's Vinaigrette", brand: "Sir Kensington's", score: 78, reason: "Sunflower oil and real ingredients with no artificial preservatives." },
    ],
    _default: [
      { name: "Primal Kitchen Caesar Dressing", brand: "Primal Kitchen", score: 84, reason: "Made with avocado oil instead of canola or soybean oil." },
      { name: "Tessemae's Organic Ranch", brand: "Tessemae's", score: 81, reason: "Cold-pressed organic oil base with no seed oils or sugar." },
      { name: "Sir Kensington's Vinaigrette", brand: "Sir Kensington's", score: 78, reason: "Real ingredients with no artificial preservatives or colors." },
    ],
  },
  "cooking oil": {
    _default: [
      { name: "Chosen Foods Avocado Oil", brand: "Chosen Foods", score: 89, reason: "Naturally refined avocado oil with a high smoke point and no additives." },
      { name: "Nutiva Organic Coconut Oil", brand: "Nutiva", score: 86, reason: "USDA Organic virgin coconut oil with no refining or bleaching." },
      { name: "California Olive Ranch Extra Virgin", brand: "California Olive Ranch", score: 88, reason: "100% California-grown olives, cold-pressed with no seed oil blending." },
    ],
  },
  cookies: {
    _default: [
      { name: "Simple Mills Crunchy Cookies", brand: "Simple Mills", score: 79, reason: "Almond flour base with coconut oil instead of seed oils." },
      { name: "Hu Kitchen Chocolate Chip Cookies", brand: "Hu Kitchen", score: 77, reason: "No refined sugar, seed oils, or artificial flavors." },
      { name: "Partake Crunchy Cookies", brand: "Partake", score: 75, reason: "Allergy-friendly with clean ingredients and no artificial additives." },
    ],
  },
  candy: {
    _default: [
      { name: "Unreal Dark Chocolate Gems", brand: "Unreal", score: 76, reason: "No artificial dyes, corn syrup, or synthetic flavors." },
      { name: "YumEarth Organic Fruit Snacks", brand: "YumEarth", score: 73, reason: "USDA Organic with real fruit juice and no artificial dyes." },
      { name: "SmartSweets Gummy Bears", brand: "SmartSweets", score: 69, reason: "Low sugar with plant-based sweeteners and no artificial colors." },
    ],
  },
  sauce: {
    _default: [
      { name: "Primal Kitchen Ketchup", brand: "Primal Kitchen", score: 84, reason: "Sweetened with dates with no high-fructose corn syrup or seed oils." },
      { name: "Sir Kensington's Classic Ketchup", brand: "Sir Kensington's", score: 81, reason: "Non-GMO tomatoes with no artificial preservatives." },
      { name: "Tessemae's Organic Dressing", brand: "Tessemae's", score: 79, reason: "Cold-pressed olive oil base with no seed oils or added sugar." },
    ],
  },
  bread: {
    _default: [
      { name: "Ezekiel 4:9 Sprouted Bread", brand: "Food For Life", score: 89, reason: "Sprouted whole grains with no preservatives or added sugar." },
      { name: "Dave's Killer Bread Thin-Sliced", brand: "Dave's Killer Bread", score: 79, reason: "USDA Organic whole grains with no artificial preservatives." },
      { name: "Base Culture Keto Bread", brand: "Base Culture", score: 77, reason: "Grain-free and gluten-free with almond and coconut flour." },
    ],
  },
  chocolate: {
    _default: [
      { name: "Hu Simple Dark Chocolate", brand: "Hu Kitchen", score: 87, reason: "Simple cacao and coconut sugar with no soy lecithin or seed oils." },
      { name: "Alter Eco Dark Chocolate", brand: "Alter Eco", score: 84, reason: "Fair trade organic cacao with minimal clean ingredients." },
      { name: "Endangered Species Dark Chocolate", brand: "Endangered Species", score: 81, reason: "Ethically sourced cacao with no artificial flavors or emulsifiers." },
    ],
  },
  popcorn: {
    _default: [
      { name: "Lesser Evil Organic Popcorn", brand: "Lesser Evil", score: 83, reason: "Popped in coconut oil with Himalayan salt and no seed oils." },
      { name: "Boom Chicka Pop Sea Salt", brand: "Angie's", score: 77, reason: "Simple popcorn with sunflower oil and sea salt." },
      { name: "Skinny Pop Original Popcorn", brand: "Skinny Pop", score: 75, reason: "Three ingredients: popcorn, oil, and salt — cleaner than most." },
    ],
  },
  noodles: {
    _default: [
      { name: "Jovial Organic Brown Rice Pasta", brand: "Jovial", score: 88, reason: "Single ingredient organic brown rice — gluten-free with no additives." },
      { name: "Banza Chickpea Pasta", brand: "Banza", score: 84, reason: "High protein chickpea pasta with no artificial ingredients." },
      { name: "Lotus Foods Organic Ramen", brand: "Lotus Foods", score: 81, reason: "Organic rice ramen with no MSG or artificial flavors." },
    ],
  },
  milk: {
    _default: [
      { name: "Malk Unsweetened Almond Milk", brand: "Malk", score: 89, reason: "Only filtered water, almonds, and salt — no gums or oils." },
      { name: "Three Trees Organic Almond Milk", brand: "Three Trees", score: 87, reason: "Clean label with no carrageenan, gums, or preservatives." },
      { name: "Califia Farms Unsweetened Oat Milk", brand: "Califia Farms", score: 77, reason: "No artificial flavors or high-fructose sweeteners." },
    ],
  },
  juice: {
    _default: [
      { name: "Lakewood Organic Pure Juice", brand: "Lakewood", score: 86, reason: "100% organic pressed juice with no added sugar or preservatives." },
      { name: "Suja Organic Cold-Pressed Juice", brand: "Suja", score: 84, reason: "Cold-pressed organic fruits and vegetables — nothing artificial." },
      { name: "Evolution Fresh Cold-Pressed Juice", brand: "Evolution Fresh", score: 79, reason: "No added sugars or artificial flavors, high-pressure processed." },
    ],
  },
  "ice cream": {
    _default: [
      { name: "Three Twins Organic Ice Cream", brand: "Three Twins", score: 81, reason: "USDA Organic with simple dairy and no artificial additives." },
      { name: "NadaMoo! Dairy-Free Ice Cream", brand: "NadaMoo!", score: 77, reason: "Coconut milk base with organic ingredients and no artificial colors." },
      { name: "Jeni's Splendid Ice Cream", brand: "Jeni's", score: 75, reason: "Small-batch with grass-fed dairy and no artificial stabilizers." },
    ],
  },
  snack: {
    _default: [
      { name: "Simple Mills Snack Crackers", brand: "Simple Mills", score: 84, reason: "Almond flour base with no seed oils or artificial additives." },
      { name: "Hu Kitchen Grain-Free Crackers", brand: "Hu Kitchen", score: 79, reason: "Paleo-friendly with cassava flour and clean ingredients." },
      { name: "RXBAR Protein Bar", brand: "RXBAR", score: 86, reason: "Minimal ingredients: egg whites, dates, and nuts — no additives." },
    ],
  },
};

function getAlternatives(product: ProductResult): Alternative[] {
  const category = inferCategory(product.name, product.brand);
  const categoryAlts = ALT_DB[category] || ALT_DB.snack;
  const flaggedCategories = [...new Set(product.flagged.map((f) => f.category))];

  for (const cat of flaggedCategories) {
    if (categoryAlts[cat]) return categoryAlts[cat];
  }

  return categoryAlts._default || ALT_DB.snack._default;
}

// ── Components ─────────────────────────────────────────────────────

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

// ── Water Comparison ───────────────────────────────────────────────
const WATER_COMPARE_KEYS = ["icelandic glacial", "waiakea", "fiji", "evian", "liquid death"] as const;

const phDotColor = (ph: number) => {
  if (ph < 6.5) return "hsl(38, 92%, 50%)";
  if (ph > 7.5) return "hsl(var(--water))";
  return "hsl(var(--muted-foreground))";
};

const WaterComparisonCard = ({ brand, isScanned }: { brand: WaterBrand; isScanned: boolean }) => (
  <div
    className="flex w-[160px] shrink-0 snap-start flex-col rounded-2xl border bg-card p-4"
    style={{
      borderColor: isScanned ? "hsl(var(--water))" : "hsl(var(--border))",
      borderWidth: isScanned ? "2px" : "1px",
    }}
  >
    {isScanned && (
      <span className="mb-2 self-start rounded-full bg-water/10 px-2.5 py-0.5 text-[10px] font-semibold text-water">
        Your scan
      </span>
    )}
    <p className="text-[14px] font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
      {brand.name}
    </p>
    <span className="mt-1.5 self-start rounded-full bg-water/10 px-2.5 py-0.5 text-[10px] font-semibold text-water">
      {brand.type}
    </span>

    {/* pH */}
    <div className="mt-3 flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: phDotColor(brand.ph) }} />
      <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {brand.ph.toFixed(1)}
      </span>
      <span className="text-[10px] text-muted-foreground">pH</span>
    </div>

    {/* TDS */}
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {brand.tds_mg_per_liter}
      </span>
      <span className="text-[10px] text-muted-foreground">mg/L TDS</span>
    </div>

    {/* Minerals */}
    <div className="mt-3 space-y-1 border-t border-border pt-2">
      {[
        { label: "Ca", value: brand.minerals.calcium },
        { label: "Mg", value: brand.minerals.magnesium },
        { label: "Na", value: brand.minerals.sodium },
      ].map((m) => (
        <div key={m.label} className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{m.label}</span>
          <span className="font-medium tabular-nums">{m.value}</span>
        </div>
      ))}
    </div>

    {/* PFAS */}
    <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 text-[10px]">
      {brand.pfas_tested ? (
        <>
          <CheckCircle2 size={12} className="text-primary" />
          <span className="font-medium text-primary">PFAS tested</span>
        </>
      ) : (
        <>
          <Minus size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">PFAS n/a</span>
        </>
      )}
    </div>
  </div>
);

const WaterComparison = ({ scannedBrandName }: { scannedBrandName?: string }) => {
  const navigate = useNavigate();
  const brands = WATER_COMPARE_KEYS.map((key) => WATER_DATABASE[key]).filter(Boolean);
  const scannedLower = scannedBrandName?.toLowerCase() ?? "";

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6 px-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Droplets size={20} className="text-water" />
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Compare water brands
          </h1>
        </div>

        <div className="mt-5 -mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto">
          <div className="flex gap-3 snap-x snap-mandatory pb-4" style={{ scrollSnapType: "x mandatory" }}>
            {brands.map((brand) => {
              const isScanned = !!scannedLower && (scannedLower.includes(brand.name.toLowerCase()) || brand.name.toLowerCase().includes(scannedLower));
              return <WaterComparisonCard key={brand.name} brand={brand} isScanned={isScanned} />;
            })}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Showing top-rated water brands by source quality and mineral profile
        </p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────
const Alternatives = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { product?: ProductResult; waterMode?: boolean; scannedBrandName?: string } | null;
  const product = locationState?.product ?? null;
  const waterMode = locationState?.waterMode ?? false;

  if (waterMode) {
    return <WaterComparison scannedBrandName={locationState?.scannedBrandName ?? product?.brand} />;
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-28">
        <ScanLine size={48} className="text-muted-foreground/40" strokeWidth={1.5} />
        <h2
          className="mt-4 text-lg font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No product scanned
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Scan a product first to see clean alternatives.
        </p>
        <button
          onClick={() => navigate("/scanner")}
          className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors"
        >
          Go to Scanner
        </button>
      </div>
    );
  }

  const alternatives = getAlternatives(product);

  return (
    <div className="min-h-screen bg-background pb-28">
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
          <span className="text-primary">{product.name}</span>
        </h1>

        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          {alternatives.map((alt) => (
            <AlternativeCard key={alt.name} alt={alt} />
          ))}
        </div>

        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Info size={13} strokeWidth={1.8} />
          Data sourced from Open Food Facts
        </div>
      </div>
    </div>
  );
};

export default Alternatives;
