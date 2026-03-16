// Simple navigation direction tracker
const ROUTE_ORDER = ["/", "/scanner", "/result", "/alternatives", "/profile", "/paywall"];

let lastPath = "/";

export function getDirection(nextPath: string): "forward" | "back" {
  const prevIdx = ROUTE_ORDER.indexOf(lastPath);
  const nextIdx = ROUTE_ORDER.indexOf(nextPath);
  const dir = nextIdx >= prevIdx ? "forward" : "back";
  lastPath = nextPath;
  return dir;
}

export function setLastPath(path: string) {
  lastPath = path;
}
