import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    const doneTimer = setTimeout(onFinish, 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <Leaf className="h-10 w-10 text-primary" strokeWidth={2.5} />
        <span className="text-4xl font-bold tracking-tight text-foreground">
          Pure
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;
