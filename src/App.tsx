import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCallback, useRef, useState } from "react";
import { getDirection } from "@/lib/nav-direction";
import BottomNav from "./components/BottomNav";
import SplashScreen from "./components/SplashScreen";
import Index from "./pages/Index";
import Scanner from "./pages/Scanner";
import Result from "./pages/Result";
import Alternatives from "./pages/Alternatives";
import Profile from "./pages/Profile";
import Paywall from "./pages/Paywall";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const isScanner = location.pathname === "/scanner";
  const dirRef = useRef<"forward" | "back">("forward");

  if (!isScanner) {
    dirRef.current = getDirection(location.pathname);
  }

  const animClass = isScanner
    ? ""
    : dirRef.current === "back"
      ? "animate-page-back"
      : "animate-page-in";

  return (
    <div key={location.pathname} className={animClass}>
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/result" element={<Result />} />
        <Route path="/alternatives" element={<Alternatives />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/paywall" element={<Paywall />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onFinish={hideSplash} />}
        <BrowserRouter>
          <AnimatedRoutes />
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
