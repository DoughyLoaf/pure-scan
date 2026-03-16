import { ScanLine, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

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
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-10">
          <Clock className="mb-3 text-muted-foreground" size={24} strokeWidth={1.6} />
          <p className="text-sm text-muted-foreground">
            No scans yet. Scan your first product above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
