import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAICostMetrics } from "@/lib/photo-scan";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

const ADMIN_PASS = "PURE_ADMIN_2025";
const AUTH_KEY = "pure_admin_auth";
const GREEN = "#16a34a";
const MUTED = "#9ca3af";

/* ─── helpers ─── */
function csvDownload(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function scoreColor(s: number | null) {
  if (s == null) return MUTED;
  if (s >= 70) return GREEN;
  if (s >= 40) return "#eab308";
  return "#ef4444";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ─── types ─── */
type Scan = {
  id: string; created_at: string; session_id: string; barcode: string | null;
  product_name: string | null; brand: string | null; pure_score: number | null;
  categories_raw: string | null; ingredients_raw: string | null;
  flagged_count: number | null; flagged_categories: string[] | null;
  flagged_ingredients: string[] | null; is_water: boolean | null;
  water_brand: string | null; app_version: string | null; platform: string | null;
};
type AltTap = {
  id: string; created_at: string; session_id: string;
  scanned_product_name: string | null; scanned_product_score: number | null;
  alternative_name: string | null; alternative_brand: string | null;
  alternative_score: number | null; action: string | null;
};
type UnknownBarcode = {
  id: string; created_at: string; barcode: string; scan_count: number; last_scanned_at: string;
};
type Session = {
  session_id: string; created_at: string; last_active_at: string;
  scan_count: number; total_ingredients_flagged: number;
  dietary_preferences: string[] | null; platform: string | null;
};
type Product = {
  id: string; barcode: string; product_name: string; brand: string | null;
  pure_score: number | null; scan_count: number; flagged_ingredients: string[] | null;
  first_scanned_at: string; last_scanned_at: string;
};
type BrandStat = {
  brand: string; total_scans: number; avg_pure_score: number | null; most_common_flag: string | null;
};
type IngredientStat = {
  ingredient_name: string; total_occurrences: number; category: string | null;
};
type Submission = {
  id: string; created_at: string; session_id: string; barcode: string;
  product_name: string | null; brand: string | null; status: string | null;
};

/* ─── password gate ─── */
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (pw === ADMIN_PASS) { localStorage.setItem(AUTH_KEY, "1"); onAuth(); }
    else setErr(true);
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-full max-w-sm">
        <h1 className="text-white text-xl font-bold mb-1">Pure. Admin</h1>
        <p className="text-gray-500 text-sm mb-6">Enter password to continue</p>
        <input
          type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && submit()}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white mb-3 focus:outline-none focus:border-green-600"
          placeholder="Password"
        />
        {err && <p className="text-red-500 text-sm mb-3">Incorrect password</p>}
        <button onClick={submit} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium">
          Sign In
        </button>
      </div>
    </div>
  );
}

/* ─── KPI tile ─── */
function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-3xl font-bold" style={{ color: GREEN }}>{value}</div>
      <div className="text-gray-500 text-sm mt-1">{label}</div>
    </div>
  );
}

/* ─── sortable table ─── */
function SortableTable({ columns, data, id }: {
  columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[];
  data: Record<string, any>[]; id: string;
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [asc, setAsc] = useState(false);
  const sorted = useMemo(() => {
    const s = [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return av < bv ? (asc ? -1 : 1) : av > bv ? (asc ? 1 : -1) : 0;
    });
    return s;
  }, [data, sortKey, asc]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map(c => (
              <th key={c.key} onClick={() => { if (sortKey === c.key) setAsc(!asc); else { setSortKey(c.key); setAsc(false); } }}
                className="text-left text-gray-400 font-medium px-4 py-3 cursor-pointer hover:text-white select-none">
                {c.label} {sortKey === c.key ? (asc ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row[id] ?? i} className={i % 2 === 0 ? "bg-gray-900/50" : ""}>
              {columns.map(c => (
                <td key={c.key} className="px-4 py-2.5 text-gray-300">
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [altTaps, setAltTaps] = useState<AltTap[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownBarcode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brandStats, setBrandStats] = useState<BrandStat[]>([]);
  const [ingredientStats, setIngredientStats] = useState<IngredientStat[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const feedTimer = useRef<ReturnType<typeof setInterval>>();

  const fetchAll = useCallback(async () => {
    const [s, sess, a, u, p, bs, is_, sub] = await Promise.all([
      supabase.from("scans").select("*").order("created_at", { ascending: false }),
      supabase.from("sessions").select("*"),
      supabase.from("alternative_taps").select("*"),
      supabase.from("unknown_barcodes").select("*").order("scan_count", { ascending: false }),
      supabase.from("products").select("*").order("scan_count", { ascending: false }).limit(50),
      supabase.from("brand_stats").select("*").order("total_scans", { ascending: false }),
      supabase.from("ingredient_stats").select("*").order("total_occurrences", { ascending: false }).limit(20),
      supabase.from("product_submissions").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setScans((s.data ?? []) as Scan[]);
    setSessions((sess.data ?? []) as Session[]);
    setAltTaps((a.data ?? []) as AltTap[]);
    setUnknowns((u.data ?? []) as UnknownBarcode[]);
    setProducts((p.data ?? []) as Product[]);
    setBrandStats((bs.data ?? []) as BrandStat[]);
    setIngredientStats((is_.data ?? []) as IngredientStat[]);
    setSubmissions((sub.data ?? []) as Submission[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    feedTimer.current = setInterval(() => { fetchAll(); setNow(new Date()); }, 30000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(feedTimer.current); clearInterval(clockTimer); };
  }, [fetchAll]);

  const signOut = () => { localStorage.removeItem(AUTH_KEY); window.location.reload(); };

  /* ─ KPIs ─ */
  const todayStr = new Date().toISOString().slice(0, 10);
  const scansToday = scans.filter(s => s.created_at.slice(0, 10) === todayStr).length;
  const avgScore = scans.length ? (scans.reduce((a, s) => a + (s.pure_score ?? 0), 0) / scans.length).toFixed(1) : "—";
  const totalFlagged = scans.reduce((a, s) => a + (s.flagged_count ?? 0), 0);
  const waterScans = scans.filter(s => s.is_water).length;

  /* ─ Charts data ─ */
  const dailyScans = useMemo(() => {
    const map: Record<string, number> = {};
    const d = new Date(); d.setDate(d.getDate() - 30);
    for (let i = 0; i < 31; i++) {
      const dd = new Date(d); dd.setDate(dd.getDate() + i);
      map[dd.toISOString().slice(0, 10)] = 0;
    }
    scans.forEach(s => { const k = s.created_at.slice(0, 10); if (k in map) map[k]++; });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [scans]);

  const topIngredients = useMemo(() => {
    const map: Record<string, number> = {};
    scans.forEach(s => (s.flagged_ingredients ?? []).forEach(ing => { map[ing] = (map[ing] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [scans]);

  const scoreDist = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0 }));
    buckets[9].range = "90-100";
    scans.forEach(s => {
      if (s.pure_score == null) return;
      const idx = Math.min(Math.floor(s.pure_score / 10), 9);
      buckets[idx].count++;
    });
    return buckets;
  }, [scans]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    scans.forEach(s => (s.flagged_categories ?? []).forEach(c => { map[c] = (map[c] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [scans]);

  const PIE_COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#eab308", "#f97316"];

  /* ─ Most scanned products (from scans table) ─ */
  const topScannedProducts = useMemo(() => {
    const map: Record<string, { name: string; brand: string; count: number; totalScore: number; flags: Record<string, number>; firstScan: string }> = {};
    scans.forEach(s => {
      const key = (s.product_name ?? "Unknown").toLowerCase();
      if (!map[key]) map[key] = { name: s.product_name ?? "Unknown", brand: s.brand ?? "—", count: 0, totalScore: 0, flags: {}, firstScan: s.created_at };
      map[key].count++;
      map[key].totalScore += s.pure_score ?? 0;
      if (s.created_at < map[key].firstScan) map[key].firstScan = s.created_at;
      (s.flagged_ingredients ?? []).forEach(f => { map[key].flags[f] = (map[key].flags[f] || 0) + 1; });
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map((p, i) => ({
        rank: i + 1, product_name: p.name, brand: p.brand, times_scanned: p.count,
        avg_score: (p.totalScore / p.count).toFixed(1),
        top_flag: Object.entries(p.flags).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
        first_scanned: fmtDate(p.firstScan),
      }));
  }, [scans]);

  /* ─ Alt taps aggregation ─ */
  const altTapsAgg = useMemo(() => {
    const map: Record<string, { name: string; brand: string; count: number; totalScanScore: number; scannedProducts: Record<string, number> }> = {};
    altTaps.forEach(t => {
      const key = (t.alternative_name ?? "").toLowerCase();
      if (!map[key]) map[key] = { name: t.alternative_name ?? "—", brand: t.alternative_brand ?? "—", count: 0, totalScanScore: 0, scannedProducts: {} };
      map[key].count++;
      map[key].totalScanScore += t.scanned_product_score ?? 0;
      const sp = t.scanned_product_name ?? "Unknown";
      map[key].scannedProducts[sp] = (map[key].scannedProducts[sp] || 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).map(p => ({
      alternative_name: p.name, brand: p.brand, times_tapped: p.count,
      avg_scanned_score: p.count ? (p.totalScanScore / p.count).toFixed(1) : "—",
      top_trigger: Object.entries(p.scannedProducts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    }));
  }, [altTaps]);

  /* ─ Live feed ─ */
  const liveFeed = scans.slice(0, 50);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="text-xl font-bold">Pure<span className="text-green-500">.</span> Admin</div>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button onClick={() => csvDownload(scans as any[], "pure_scans.csv")} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300">Export Scans</button>
            <button onClick={() => csvDownload(unknowns as any[], "pure_unknown_barcodes.csv")} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300">Export Unknown</button>
            <button onClick={() => csvDownload(altTaps as any[], "pure_alternative_taps.csv")} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300">Export Alt Taps</button>
          </div>
          <span className="text-gray-500 text-sm">{now.toLocaleString()}</span>
          <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300">Sign Out</button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
        {/* KPI Tiles */}
        <div className="grid grid-cols-4 gap-4">
          <Tile label="Total Scans" value={scans.length} />
          <Tile label="Active Sessions" value={sessions.length} />
          <Tile label="Scans Today" value={scansToday} />
          <Tile label="Avg Pure Score" value={avgScore} />
          <Tile label="Total Ingredients Flagged" value={totalFlagged} />
          <Tile label="Water Scans" value={waterScans} />
          <Tile label="Unknown Barcodes" value={unknowns.length} />
          <Tile label="Alternative Taps" value={altTaps.length} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm text-gray-400 mb-4">Scans Over Time (30d)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyScans}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} labelStyle={{ color: MUTED }} />
                <Line type="monotone" dataKey="count" stroke={GREEN} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm text-gray-400 mb-4">Top Flagged Ingredients</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topIngredients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: MUTED, fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
                <Bar dataKey="count" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm text-gray-400 mb-4">Pure Score Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="range" tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
                <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ══════ NEW: Products Database ══════ */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Products Database — Top 50 by Scan Count</h3>
          <SortableTable
            id="id"
            columns={[
              { key: "rank", label: "#" },
              { key: "product_name", label: "Product Name" },
              { key: "brand", label: "Brand" },
              { key: "scan_count", label: "Times Scanned" },
              { key: "pure_score", label: "Pure Score", render: (v) => <span style={{ color: scoreColor(v) }}>{v ?? "—"}</span> },
              { key: "top_flag", label: "Top Flag" },
              { key: "first_scanned_at", label: "First Seen", render: (v) => fmtDate(v) },
              { key: "last_scanned_at", label: "Last Seen", render: (v) => fmtDate(v) },
            ]}
            data={products.map((p, i) => ({
              ...p,
              rank: i + 1,
              top_flag: (p.flagged_ingredients ?? [])[0] ?? "—",
            }))}
          />
        </div>

        {/* ══════ NEW: Brand Intelligence ══════ */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Brand Intelligence</h3>
          <SortableTable
            id="brand"
            columns={[
              { key: "brand", label: "Brand" },
              { key: "total_scans", label: "Total Scans" },
              { key: "avg_pure_score", label: "Avg Pure Score", render: (v) => <span style={{ color: scoreColor(v != null ? Math.round(Number(v)) : null) }}>{v != null ? Number(v).toFixed(1) : "—"}</span> },
              { key: "most_common_flag", label: "Most Common Flag" },
            ]}
            data={brandStats}
          />
        </div>

        {/* ══════ NEW: Ingredient Intelligence ══════ */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Ingredient Intelligence — Top 20</h3>
          <SortableTable
            id="ingredient_name"
            columns={[
              { key: "ingredient_name", label: "Ingredient Name" },
              { key: "category", label: "Category" },
              { key: "total_occurrences", label: "Total Occurrences" },
            ]}
            data={ingredientStats}
          />
        </div>

        {/* ══════ NEW: Pending Submissions ══════ */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Pending Submissions — User-Contributed Data Queue</h3>
          {submissions.length === 0 ? (
            <p className="text-gray-600 text-sm py-4 text-center">No pending submissions</p>
          ) : (
            <SortableTable
              id="id"
              columns={[
                { key: "barcode", label: "Barcode", render: (v) => <code className="text-green-400">{v}</code> },
                { key: "product_name", label: "Product Name" },
                { key: "brand", label: "Brand" },
                { key: "created_at", label: "Submitted", render: (v) => fmtTime(v) },
                { key: "session_id", label: "Session", render: (v) => <span className="text-gray-500 text-xs">{String(v).slice(0, 8)}…</span> },
              ]}
              data={submissions}
            />
          )}
        </div>

        {/* Most Scanned Products (from scans) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Top 25 Most Scanned Products (Scan Log)</h3>
          <SortableTable
            id="rank"
            columns={[
              { key: "rank", label: "#" },
              { key: "product_name", label: "Product Name" },
              { key: "brand", label: "Brand" },
              { key: "times_scanned", label: "Times Scanned" },
              { key: "avg_score", label: "Avg Score", render: (v) => <span style={{ color: scoreColor(parseFloat(v)) }}>{v}</span> },
              { key: "top_flag", label: "Most Common Flag" },
              { key: "first_scanned", label: "First Scanned" },
            ]}
            data={topScannedProducts}
          />
        </div>

        {/* Unknown Barcodes */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Unknown Barcodes — Products to Add</h3>
          <SortableTable
            id="id"
            columns={[
              { key: "rank", label: "#" },
              { key: "barcode", label: "Barcode", render: (v) => (
                <span className="flex items-center gap-2">
                  <code className="text-green-400">{v}</code>
                  <button onClick={() => navigator.clipboard.writeText(v)} className="text-xs text-gray-500 hover:text-white">Copy</button>
                </span>
              )},
              { key: "scan_count", label: "Times Scanned" },
              { key: "last_scanned_at", label: "Last Scanned", render: (v) => fmtTime(v) },
            ]}
            data={unknowns.map((u, i) => ({ ...u, rank: i + 1 }))}
          />
        </div>

        {/* Alternative Taps */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Alternative Taps — Conversion Data</h3>
          <SortableTable
            id="alternative_name"
            columns={[
              { key: "alternative_name", label: "Alternative Name" },
              { key: "brand", label: "Brand" },
              { key: "times_tapped", label: "Times Tapped" },
              { key: "avg_scanned_score", label: "Avg Scanned Score", render: (v) => <span style={{ color: scoreColor(parseFloat(v)) }}>{v}</span> },
              { key: "top_trigger", label: "Most Common Trigger" },
            ]}
            data={altTapsAgg}
          />
        </div>

        {/* Flagged Categories Donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm text-gray-400 mb-4">Flagged Categories Breakdown</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={300} height={250}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryBreakdown.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-300">{c.name}</span>
                  <span className="text-gray-500">({c.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-400">Live Feed — Last 50 Scans</h3>
            <span className="text-xs text-gray-600">Auto-refreshes every 30s</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Time</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Product</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Brand</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Score</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {liveFeed.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-gray-900/50" : ""}>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtTime(s.created_at)}</td>
                    <td className="px-4 py-2.5 text-gray-300">{s.product_name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400">{s.brand ?? "—"}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: scoreColor(s.pure_score) }}>{s.pure_score ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{(s.flagged_ingredients ?? []).join(", ") || "—"}</td>
                  </tr>
                ))}
                {liveFeed.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-600 py-8">No scans yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN EXPORT ─── */
export default function Admin() {
  const [authed, setAuthed] = useState(localStorage.getItem(AUTH_KEY) === "1");
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;
  return <Dashboard />;
}
