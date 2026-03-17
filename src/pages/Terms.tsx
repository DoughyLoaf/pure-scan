import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "Use of the App",
    body: "Pure is designed for informational purposes only. The scores and ingredient analyses provided are not medical advice and should not be used as a substitute for professional dietary guidance.",
  },
  {
    title: "Accuracy",
    body: "Scores are calculated based on publicly available ingredient lists from the Open Food Facts database. Pure makes no guarantees regarding the completeness or accuracy of this data.",
  },
  {
    title: "Subscription",
    body: "Pure Pro is billed monthly. You can cancel your subscription at any time through your App Store or Google Play settings. No refunds are provided for partial billing periods.",
  },
  {
    title: "Disclaimer",
    body: "Always consult a qualified healthcare professional before making dietary decisions. Pure is a tool to help you make more informed choices, but it does not replace expert medical advice.",
  },
  {
    title: "Contact",
    body: "If you have any questions about these terms, please reach out to us at support@pureapp.com.",
  },
];

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 sm:px-6 pt-12 sm:pt-14">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>

        <h1
          className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Terms of Service
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: March 2026</p>

        <div className="mt-6 flex flex-col gap-5">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Terms;
