import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";

const FREE_FEATURES = [
  "5 scans per day",
  "Basic Pure Score",
];

const PRO_FEATURES = [
  "Unlimited scans",
  "Full ingredient breakdown",
  "Clean alternatives",
  "Scan history",
];

const Paywall = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 sm:px-6 pb-10 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Pure<span className="text-primary">.</span> Plans
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors active:bg-muted"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        You've used all your free scans for today. Upgrade to keep scanning.
      </p>

      {/* Plans */}
      <div className="mt-6 sm:mt-8 flex flex-col gap-4">
        {/* Free Plan */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Pure Free
            </h3>
            <span className="rounded-full border border-primary/30 bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Your plan
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">$0 / month</p>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check size={14} className="shrink-0 text-primary" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Plan */}
        <div className="rounded-2xl border-2 border-primary bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Pure Pro
            </h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Recommended
            </span>
          </div>
          <p className="mt-0.5 text-sm text-foreground">
            <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>$6.99</span>
            <span className="text-muted-foreground"> / month</span>
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check size={14} className="shrink-0 text-primary" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          <button className="mt-5 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors">
            Start 7-day free trial
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        No hidden charges. Cancel anytime in your App Store settings.
      </p>
    </div>
  );
};

export default Paywall;
