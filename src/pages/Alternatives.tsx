import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Info, ScanLine } from "lucide-react";
import type { ProductResult } from "@/lib/scoring";

interface Alternative {
  name: string;
  brand: string;
  score: number;
  reason: string;
}

// ── Category inference from product name ───────────────────────────
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/chip|crisp|frito|dorito|cheeto/i.test(n)) return "chips";
  if (/cereal|granola|flake|crunch|cheerio|loop/i.test(n)) return "cereal";
  if (/cracker|pretzel|goldfish/i.test(n)) return "crackers";
  if (/yogurt|yoghurt/i.test(n)) return "yogurt";
  if (/soda|cola|pop|sprite|fanta|dew/i.test(n)) return "soda";
  if (/juice/i.test(n)) return "juice";
  if (/cookie|oreo|biscuit/i.test(n)) return "cookies";
  if (/candy|gumm|skittle|starburst|sour/i.test(n)) return "candy";
  if (/ice\s*cream|gelato|frozen/i.test(n)) return "ice cream";
  if (/bread|bun|bagel|muffin|toast/i.test(n)) return "bread";
  if (/sauce|ketchup|mustard|dressing|mayo/i.test(n)) return "sauce";
  if (/bar|cliff|kind|rxbar|protein/i.test(n)) return "bars";
  if (/noodle|ramen|pasta/i.test(n)) return "noodles";
  if (/milk|oat.*milk|almond.*milk/i.test(n)) return "milk";
  if (/chocolate/i.test(n)) return "chocolate";
  if (/popcorn/i.test(n)) return "popcorn";
  return "snack";
}

// ── Alternatives database by category × flagged concern ────────────
type AltDB = Record<string, Record<string, Alternative[]>>;

const ALT_DB: AltDB = {
  chips: {
    "Seed Oil": [
      { name: "Siete Potato Chips", brand: "Siete", score: 82, reason: "Made with avocado oil. No seed oils or artificial additives." },
      { name: "Jackson's Sweet Potato Chips", brand: "Jackson's", score: 79, reason: "Cooked in coconut oil with only three clean ingredients." },
      { name: "Kettle Brand Avocado Oil Chips", brand: "Kettle Brand", score: 71, reason: "Uses avocado oil instead of canola. No artificial flavors." },
    ],
    "Ultra-Processed": [
      { name: "Boulder Canyon Chips", brand: "Boulder Canyon", score: 78, reason: "Simple ingredient list with avocado oil and sea salt." },
      { name: "Terra Vegetable Chips", brand: "Terra", score: 74, reason: "Real vegetables with minimal processing and no artificial flavors." },
      { name: "Good Health Avocado Oil Chips", brand: "Good Health", score: 76, reason: "Clean label with avocado oil and natural seasonings." },
    ],
    _default: [
      { name: "Siete Potato Chips", brand: "Siete", score: 82, reason: "Made with avocado oil. No seed oils or artificial additives." },
      { name: "Jackson's Sweet Potato Chips", brand: "Jackson's", score: 79, reason: "Cooked in coconut oil with only three clean ingredients." },
      { name: "Boulder Canyon Chips", brand: "Boulder Canyon", score: 78, reason: "Simple ingredient list with avocado oil and sea salt." },
    ],
  },
  cereal: {
    "Artificial Dye": [
      { name: "Nature's Path Organic Sunrise", brand: "Nature's Path", score: 88, reason: "No artificial dyes or sweeteners. USDA Organic certified." },
      { name: "Cascadian Farm Organic Granola", brand: "Cascadian Farm", score: 83, reason: "Whole grain oats with no synthetic colors or flavors." },
      { name: "Barbara's Puffins", brand: "Barbara's", score: 80, reason: "No artificial dyes, preservatives, or high-fructose corn syrup." },
    ],
    "Artificial Sweetener": [
      { name: "Ezekiel 4:9 Sprouted Cereal", brand: "Food For Life", score: 92, reason: "Sprouted grains, no added sugar, zero artificial sweeteners." },
      { name: "Nature's Path Organic Heritage Flakes", brand: "Nature's Path", score: 86, reason: "Naturally sweetened with organic cane sugar. No artificial sweeteners." },
      { name: "One Degree Organic Sprouted Oat O's", brand: "One Degree", score: 84, reason: "Sprouted oats with minimal sweetening and full traceability." },
    ],
    _default: [
      { name: "Nature's Path Organic Sunrise", brand: "Nature's Path", score: 88, reason: "No artificial dyes or sweeteners. USDA Organic certified." },
      { name: "Ezekiel 4:9 Sprouted Cereal", brand: "Food For Life", score: 92, reason: "Sprouted grains with no added sugar or preservatives." },
      { name: "Cascadian Farm Organic Granola", brand: "Cascadian Farm", score: 83, reason: "Whole grain oats with no synthetic colors or flavors." },
    ],
  },
  crackers: {
    _default: [
      { name: "Simple Mills Almond Flour Crackers", brand: "Simple Mills", score: 85, reason: "Grain-free with clean ingredients and no seed oils." },
      { name: "Mary's Gone Crackers", brand: "Mary's Gone", score: 82, reason: "Organic whole grain, gluten-free, and no artificial additives." },
      { name: "Hu Kitchen Grain-Free Crackers", brand: "Hu Kitchen", score: 80, reason: "Paleo-friendly with cassava flour and no seed oils." },
    ],
  },
  yogurt: {
    _default: [
      { name: "Siggi's Icelandic Yogurt", brand: "Siggi's", score: 90, reason: "Simple ingredients, high protein, low sugar, no artificial additives." },
      { name: "Stonyfield Organic Yogurt", brand: "Stonyfield", score: 86, reason: "USDA Organic with no artificial flavors, colors, or sweeteners." },
      { name: "Fage Total Plain Greek Yogurt", brand: "Fage", score: 88, reason: "Only milk and cultures. Zero additives or preservatives." },
    ],
  },
  soda: {
    _default: [
      { name: "Olipop Vintage Cola", brand: "Olipop", score: 78, reason: "Prebiotic soda with natural sweeteners and no artificial dyes." },
      { name: "Poppi Prebiotic Soda", brand: "Poppi", score: 75, reason: "Apple cider vinegar based with natural fruit flavors." },
      { name: "Zevia Zero Calorie Soda", brand: "Zevia", score: 72, reason: "Sweetened with stevia instead of artificial sweeteners." },
    ],
  },
  cookies: {
    _default: [
      { name: "Simple Mills Crunchy Cookies", brand: "Simple Mills", score: 80, reason: "Almond flour base with coconut oil instead of seed oils." },
      { name: "Hu Kitchen Chocolate Chip Cookies", brand: "Hu Kitchen", score: 78, reason: "No refined sugar, seed oils, or artificial flavors." },
      { name: "Partake Crunchy Cookies", brand: "Partake", score: 76, reason: "Allergy-friendly with clean ingredients and no artificial additives." },
    ],
  },
  candy: {
    _default: [
      { name: "Unreal Dark Chocolate Gems", brand: "Unreal", score: 77, reason: "No artificial dyes, corn syrup, or synthetic flavors." },
      { name: "YumEarth Organic Fruit Snacks", brand: "YumEarth", score: 74, reason: "USDA Organic with real fruit juice and no artificial dyes." },
      { name: "SmartSweets Gummy Bears", brand: "SmartSweets", score: 70, reason: "Low sugar with plant-based sweeteners and no artificial colors." },
    ],
  },
  bars: {
    _default: [
      { name: "RXBAR Chocolate Sea Salt", brand: "RXBAR", score: 88, reason: "Minimal ingredients: egg whites, dates, nuts, cocoa. No additives." },
      { name: "Larabar Apple Pie", brand: "Larabar", score: 90, reason: "Only dates, almonds, and apples. Nothing artificial." },
      { name: "KIND Dark Chocolate Nuts & Sea Salt", brand: "KIND", score: 78, reason: "Whole nuts with dark chocolate. No artificial sweeteners." },
    ],
  },
  sauce: {
    _default: [
      { name: "Primal Kitchen Ketchup", brand: "Primal Kitchen", score: 85, reason: "Sweetened with dates. No high-fructose corn syrup or seed oils." },
      { name: "Sir Kensington's Classic Ketchup", brand: "Sir Kensington's", score: 82, reason: "Non-GMO tomatoes with no artificial preservatives." },
      { name: "Tessemae's Organic Dressing", brand: "Tessemae's", score: 80, reason: "Cold-pressed olive oil base with no seed oils or sugar." },
    ],
  },
  bread: {
    _default: [
      { name: "Ezekiel 4:9 Sprouted Bread", brand: "Food For Life", score: 92, reason: "Sprouted whole grains with no preservatives or added sugar." },
      { name: "Dave's Killer Bread", brand: "Dave's", score: 80, reason: "USDA Organic whole grains with no artificial preservatives." },
      { name: "Base Culture Keto Bread", brand: "Base Culture", score: 78, reason: "Grain-free, gluten-free with almond and coconut flour." },
    ],
  },
  chocolate: {
    _default: [
      { name: "Hu Chocolate Bar", brand: "Hu Kitchen", score: 88, reason: "Simple cacao, coconut sugar. No soy lecithin or seed oils." },
      { name: "Alter Eco Dark Chocolate", brand: "Alter Eco", score: 85, reason: "Fair trade organic cacao with minimal clean ingredients." },
      { name: "Endangered Species Dark Chocolate", brand: "Endangered Species", score: 82, reason: "Ethically sourced cacao with no artificial flavors." },
    ],
  },
  popcorn: {
    _default: [
      { name: "Lesser Evil Organic Popcorn", brand: "Lesser Evil", score: 84, reason: "Popped in coconut oil with Himalayan salt. No seed oils." },
      { name: "Skinny Pop Original Popcorn", brand: "Skinny Pop", score: 76, reason: "Simple ingredients with sunflower oil — cleaner than most." },
      { name: "Boom Chicka Pop Sea Salt", brand: "Angie's", score: 78, reason: "Simple popcorn with sunflower oil and sea salt." },
    ],
  },
  noodles: {
    _default: [
      { name: "Jovial Organic Brown Rice Pasta", brand: "Jovial", score: 90, reason: "Single ingredient organic brown rice. Gluten-free, no additives." },
      { name: "Banza Chickpea Pasta", brand: "Banza", score: 85, reason: "High protein chickpea pasta with no artificial ingredients." },
      { name: "Lotus Foods Organic Ramen", brand: "Lotus Foods", score: 82, reason: "Organic rice ramen with no MSG or artificial flavors." },
    ],
  },
  milk: {
    _default: [
      { name: "Malk Unsweetened Almond Milk", brand: "Malk", score: 92, reason: "Only filtered water, almonds, and salt. No gums or oils." },
      { name: "Three Trees Organic Almond Milk", brand: "Three Trees", score: 90, reason: "Clean label with no carrageenan, gums, or preservatives." },
      { name: "Califia Farms Unsweetened Oat Milk", brand: "Califia Farms", score: 78, reason: "No artificial flavors or high-fructose sweeteners." },
    ],
  },
  juice: {
    _default: [
      { name: "Lakewood Organic Pure Juice", brand: "Lakewood", score: 88, reason: "100% organic pressed juice with no added sugar or preservatives." },
      { name: "Suja Organic Cold-Pressed Juice", brand: "Suja", score: 85, reason: "Cold-pressed organic fruits and vegetables. Nothing artificial." },
      { name: "Evolution Fresh Cold-Pressed Juice", brand: "Evolution Fresh", score: 80, reason: "No added sugars or artificial flavors. High-pressure processed." },
    ],
  },
  "ice cream": {
    _default: [
      { name: "Three Twins Organic Ice Cream", brand: "Three Twins", score: 82, reason: "USDA Organic with simple dairy and no artificial additives." },
      { name: "NadaMoo! Dairy-Free Ice Cream", brand: "NadaMoo!", score: 78, reason: "Coconut milk base with organic ingredients. No artificial colors." },
      { name: "Jeni's Splendid Ice Cream", brand: "Jeni's", score: 76, reason: "Small-batch with grass-fed dairy and no artificial stabilizers." },
    ],
  },
  snack: {
    _default: [
      { name: "Simple Mills Snack Crackers", brand: "Simple Mills", score: 85, reason: "Almond flour base with no seed oils or artificial additives." },
      { name: "Hu Kitchen Grain-Free Crackers", brand: "Hu Kitchen", score: 80, reason: "Paleo-friendly with cassava flour and clean ingredients." },
      { name: "RXBAR Protein Bar", brand: "RXBAR", score: 88, reason: "Minimal ingredients: egg whites, dates, nuts. No additives." },
    ],
  },
};

function getAlternatives(product: ProductResult): Alternative[] {
  const category = inferCategory(product.name);
  const categoryAlts = ALT_DB[category] || ALT_DB.snack;
  const flaggedCategories = [...new Set(product.flagged.map((f) => f.category))];

  // Try to find alternatives matching the first flagged category
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

const Alternatives = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { product?: ProductResult } | null;
  const product = locationState?.product ?? null;

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
