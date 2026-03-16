import { ScanLine, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getScanHistory } from "@/lib/scan-history";
import type { ScanHistoryEntry } from "@/lib/scan-history";

const scoreColor = (score: number) => {
  if (score < 40) return "hsl(0, 72%, 51%)";
  if (score < 75) return "hsl(38, 92%, 50%)";
  return "hsl(var(--primary))";
};

const HistoryCard = ({ entry }: { entry: ScanHistoryEntry }) => {
  const navigate = useNavigate();
  const { product, scannedAt } = entry;
  const timeAgo = getRelativeTime(scannedAt);

  return (
    <button
      onClick={() => navigate("/result", { state: { product } })}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
    >
      {/* Mini score */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: scoreColor(product.score),
          backgroundColor: scoreColor(product.score) + "14",
        }}
      >
        {product.score}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {product.name}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {product.brand} · {timeAgo}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  );
};

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Index = () => {
  const navigate = useNavigate();
  const history = getScanHistory();

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-24 pt-14">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Know what's in your food.
        </p>
      </div>

      {/* Hero CTA */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-10">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <ScanLine className="text-primary" size={28} strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Scan a product
        </h2>
        <p className="mt-1 mb-6 text-center text-sm text-muted-foreground">
          Check ingredients for seed oils, additives &amp; artificial ingredients.
        </p>
        <button
          onClick={() => navigate("/scanner")}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors active:opacity-90"
        >
          Start Scanning
        </button>
      </div>

      {/* Recent Scans */}
      <div className="mt-10">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Scans
        </h3>
        {history.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-10">
            <Clock className="mb-3 text-muted-foreground" size={24} strokeWidth={1.6} />
            <p className="text-sm text-muted-foreground">
              No scans yet. Scan your first product above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry, i) => (
              <HistoryCard key={`${entry.product.name}-${i}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
