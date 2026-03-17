import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "What We Collect",
    body: "Your scan history is stored locally on your device. No account is required to use Pure, and no personal data is sent to our servers. Everything stays on your phone.",
  },
  {
    title: "How We Use It",
    body: "Your locally stored data is used solely to display your scan history and streak. We never sell, share, or transmit your data to any third party.",
  },
  {
    title: "Third-Party Services",
    body: "Pure uses the Open Food Facts API to retrieve product data. When you scan a barcode, a request is made to their servers to fetch ingredient information. Their privacy policy applies to that data exchange.",
  },
  {
    title: "Data Deletion",
    body: "You can delete all locally stored data at any time by tapping \"Clear History\" on the Profile screen. This permanently removes your scan history from your device.",
  },
  {
    title: "Contact",
    body: "If you have any questions about this privacy policy, please reach out to us at support@pureapp.com.",
  },
];

const PrivacyPolicy = () => {
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
          Privacy Policy
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

export default PrivacyPolicy;
