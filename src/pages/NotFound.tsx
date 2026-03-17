import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="text-muted-foreground">Looks like this page doesn't exist.</p>
      <a
        href="/"
        className="mt-2 inline-block rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go Home
      </a>
    </div>
  );
};

export default NotFound;
