import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { TrendingUp, FileText, Building2, MoreVertical, Info, ChevronRight, ArrowUpRight, ArrowDownRight, BarChart3, Filter, Settings, CircleDollarSign, Eye, EyeOff, RotateCcw, Palette, Type, Hash, Activity, Users, DollarSign, Layers, GripVertical, ChevronDown, X, Search } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";
import { useState, useEffect, useMemo, useCallback } from "react";
import DataDetailPopup from "./DataDetailPopup";
import StatCardManager from "./StatCardManager";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Edit, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";
import { Switch } from "@/components/ui/switch";

const COLORS = ["#1E1B4B", "#312E81", "#4338CA", "#6366F1", "#818CF8", "#A5B4FC"];
const BAR_COLOR = "#2E2A6E";

// ─── Available icons for KPI card customization ───
const ICON_OPTIONS = [
  { id: "dollar", label: "Dollar", Icon: CircleDollarSign },
  { id: "trending", label: "Trending", Icon: TrendingUp },
  { id: "bar", label: "Bar Chart", Icon: BarChart3 },
  { id: "file", label: "File", Icon: FileText },
  { id: "building", label: "Building", Icon: Building2 },
  { id: "users", label: "Users", Icon: Users },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "hash", label: "Hash", Icon: Hash },
];

// ─── Available metrics for KPI cards ───
const METRIC_OPTIONS = [
  { id: "total_revenue", label: "Total Revenue", format: "currency" },
  { id: "avg_revenue", label: "Average Revenue", format: "currency" },
  { id: "total_entries", label: "Total Entries", format: "number" },
  { id: "restaurant_count", label: "Restaurant Count", format: "number" },
  { id: "top_restaurant_rev", label: "Top Restaurant Revenue", format: "currency" },
  { id: "lowest_restaurant_rev", label: "Lowest Restaurant Revenue", format: "currency" },
];

const GRADIENT_OPTIONS = [
  { id: "violet", label: "Violet", from: "from-violet-600", to: "to-violet-800", shadow: "shadow-violet-200" },
  { id: "blue", label: "Blue", from: "from-blue-600", to: "to-blue-800", shadow: "shadow-blue-200" },
  { id: "emerald", label: "Emerald", from: "from-emerald-600", to: "to-emerald-800", shadow: "shadow-emerald-200" },
  { id: "rose", label: "Rose", from: "from-rose-600", to: "to-rose-800", shadow: "shadow-rose-200" },
  { id: "amber", label: "Amber", from: "from-amber-600", to: "to-amber-800", shadow: "shadow-amber-200" },
  { id: "slate", label: "Slate", from: "from-slate-700", to: "to-slate-900", shadow: "shadow-slate-200" },
  { id: "none", label: "White (No gradient)", from: "", to: "", shadow: "" },
];

// ─── Gauge Chart (stroke-dasharray approach) ───
const GaugeChart = ({ value, target }) => {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const R = 80, SW = 20, CX = 120, CY = 105;
  const halfCircum = Math.PI * R;
  const filled = (pct / 100) * halfCircum;
  const labelR = R + 24;
  const labelPos = (frac) => {
    const angle = Math.PI * (1 - frac);
    return { x: CX + labelR * Math.cos(angle), y: CY - labelR * Math.sin(angle) };
  };
  const ticks = [{ frac: 0, label: "0%" }, { frac: 0.3, label: "30%" }, { frac: 0.6, label: "60%" }, { frac: 1, label: "100%" }];
  const dotAngle = Math.PI * (1 - pct / 100);
  const dotX = CX + R * Math.cos(dotAngle);
  const dotY = CY - R * Math.sin(dotAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 140" className="w-full max-w-[260px]">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="50%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="#E5E7EB" strokeWidth={SW} strokeLinecap="round" />
        {pct > 0 && (
          <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth={SW} strokeLinecap="round" strokeDasharray={`${filled} ${halfCircum}`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
        )}
        {pct > 2 && <circle cx={dotX} cy={dotY} r={SW / 2 + 3} fill="#7C3AED" stroke="white" strokeWidth="3" />}
        {ticks.map((t) => { const pos = labelPos(t.frac); return <text key={t.label} x={pos.x} y={pos.y} fontSize="11" fill="#9CA3AF" textAnchor="middle" dominantBaseline="middle">{t.label}</text>; })}
        <text x={CX} y={CY - 15} fontSize="32" fontWeight="700" fill="currentColor" className="text-gray-900 dark:text-white" textAnchor="middle">{pct.toFixed(0)}%</text>
      </svg>
      <div className="flex items-center gap-2 -mt-2">
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400"><CurrencyDisplay amount={value} compact /></span>
        <span className="text-sm text-gray-300 dark:text-gray-600">|</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Goal <CurrencyDisplay amount={target} compact /></span>
      </div>
    </div>
  );
};

// ─── Donut for conversion ───
const ConversionDonut = ({ value, label }) => {
  const r = 45, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="w-28 h-28">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#7C3AED" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (value / 100) * circ} transform="rotate(-90 60 60)" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{label}</span>
    </div>
  );
};

// ─── Pipeline stacked bar ───
const PipelineBar = ({ data, colors }) => {
  const total = data.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
      {data.map((item, index) => (
        <div key={index} className="h-full transition-all duration-500" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: colors[index % colors.length] }} />
      ))}
    </div>
  );
};

// ─── "See All" Detail Dialog ───
const SeeAllDialog = ({ open, onClose, title, data, columns }) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Full data view</DialogDescription>
      </DialogHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => <th key={col.key} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                {columns.map((col) => <td key={col.key} className="py-2.5 px-3 text-gray-700 dark:text-gray-300">{col.render ? col.render(row) : row[col.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const DashboardStats = ({ stats, employeeStats, groupBy = "date", onUpdateStats }) => {
  const { labels } = useBusinessConfig();

  // ─── State ───
  const [detailPopup, setDetailPopup] = useState({ isOpen: false, data: null, type: "general" });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, chartId: null, chartType: null });
  const [editDialog, setEditDialog] = useState({ isOpen: false, chartId: null, chartType: null });
  const [cardEditDialog, setCardEditDialog] = useState({ isOpen: false, cardId: null });
  const [seeAllDialog, setSeeAllDialog] = useState({ isOpen: false, title: "", data: [], columns: [] });
  const [barFilterRestaurant, setBarFilterRestaurant] = useState("all");
  const [barSortOrder, setBarSortOrder] = useState("desc");
  const [barShowCount, setBarShowCount] = useState(5);
  const [tableVisibleCols, setTableVisibleCols] = useState(() => {
    const saved = localStorage.getItem('dashTableCols');
    return saved ? JSON.parse(saved) : { name: true, type: true, revenue: true, share: true, priority: true, entries: false, brand: false };
  });

  // Persisted card configs
  const [cardConfigs, setCardConfigs] = useState(() => {
    const saved = localStorage.getItem('kpiCardConfigs');
    return saved ? JSON.parse(saved) : {
      'total-revenue': { title: `Total ${labels.revenue}`, metric: 'total_revenue', icon: 'dollar', gradient: 'violet', isGradient: true },
      'avg-revenue': { title: `Average ${labels.revenue}`, metric: 'avg_revenue', icon: 'bar', gradient: 'none', isGradient: false },
      'total-entries': { title: 'Total Entries', metric: 'total_entries', icon: 'file', gradient: 'none', isGradient: false },
    };
  });

  const [hiddenCards, setHiddenCards] = useState(() => {
    const saved = localStorage.getItem('hiddenCards');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [hiddenCharts, setHiddenCharts] = useState(() => {
    const saved = localStorage.getItem('hiddenCharts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [chartConfigs, setChartConfigs] = useState(() => {
    const saved = localStorage.getItem('chartConfigs');
    return saved ? JSON.parse(saved) : {
      'bar-chart': { title: `${labels.revenue} by ${labels.entity}`, color: BAR_COLOR, type: 'bar' },
      'line-chart': { title: `Daily ${labels.revenue}`, color: '#7C3AED', type: 'line' },
    };
  });

  // Persist everything
  useEffect(() => { localStorage.setItem('chartConfigs', JSON.stringify(chartConfigs)); }, [chartConfigs]);
  useEffect(() => { localStorage.setItem('kpiCardConfigs', JSON.stringify(cardConfigs)); }, [cardConfigs]);
  useEffect(() => { localStorage.setItem('hiddenCards', JSON.stringify([...hiddenCards])); }, [hiddenCards]);
  useEffect(() => { localStorage.setItem('hiddenCharts', JSON.stringify([...hiddenCharts])); }, [hiddenCharts]);
  useEffect(() => { localStorage.setItem('dashTableCols', JSON.stringify(tableVisibleCols)); }, [tableVisibleCols]);

  // ─── Computed ───
  const getMetricValue = useCallback((metricId) => {
    if (!stats) return 0;
    switch (metricId) {
      case 'total_revenue': return stats.total_revenue;
      case 'avg_revenue': return stats.total_entries > 0 ? stats.total_revenue / stats.total_entries : 0;
      case 'total_entries': return stats.total_entries;
      case 'restaurant_count': return stats.restaurant_breakdown?.length || 0;
      case 'top_restaurant_rev': return stats.restaurant_breakdown?.length > 0 ? Math.max(...stats.restaurant_breakdown.map(r => r.total)) : 0;
      case 'lowest_restaurant_rev': return stats.restaurant_breakdown?.length > 0 ? Math.min(...stats.restaurant_breakdown.map(r => r.total)) : 0;
      default: return 0;
    }
  }, [stats]);

  const getMetricFormat = (metricId) => METRIC_OPTIONS.find(m => m.id === metricId)?.format || 'number';

  const topRestaurants = useMemo(() => {
    if (!stats?.restaurant_breakdown) return [];
    let data = [...stats.restaurant_breakdown];
    if (barFilterRestaurant !== "all") {
      data = data.filter(r => r.restaurant_name === barFilterRestaurant);
    }
    data.sort((a, b) => barSortOrder === "desc" ? b.total - a.total : a.total - b.total);
    return data.slice(0, barShowCount);
  }, [stats, barFilterRestaurant, barSortOrder, barShowCount]);

  const pipelineData = useMemo(() => {
    if (!stats?.restaurant_breakdown) return [];
    return [...stats.restaurant_breakdown].sort((a, b) => b.total - a.total).map((r) => ({
      name: r.restaurant_name,
      value: r.total,
      percentage: stats.total_revenue > 0 ? ((r.total / stats.total_revenue) * 100).toFixed(0) : 0,
    }));
  }, [stats]);

  const revenueGrowth = useMemo(() => {
    if (!stats?.date_wise_revenue || stats.date_wise_revenue.length < 2) return 0;
    const dates = stats.date_wise_revenue;
    const mid = Math.floor(dates.length / 2);
    const first = dates.slice(0, mid).reduce((s, d) => s + d.total, 0);
    const second = dates.slice(mid).reduce((s, d) => s + d.total, 0);
    if (first === 0) return 0;
    return ((second - first) / first * 100).toFixed(0);
  }, [stats]);

  // Card-level growth (dynamic, not hardcoded)
  const getCardGrowth = useCallback((metricId) => {
    if (!stats?.date_wise_revenue || stats.date_wise_revenue.length < 4) return { value: 0, direction: 'up' };
    if (metricId === 'total_revenue' || metricId === 'avg_revenue') {
      const g = Number(revenueGrowth);
      return { value: Math.abs(g), direction: g >= 0 ? 'up' : 'down' };
    }
    return { value: Math.abs(Number(revenueGrowth) || 0), direction: Number(revenueGrowth) >= 0 ? 'up' : 'down' };
  }, [stats, revenueGrowth]);

  const showDataDetail = (data, type = "chart") => setDetailPopup({ isOpen: true, data, type });
  const formatCompactNumber = (num) => { if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`; if (num >= 1000) return `${(num / 1000).toFixed(1)}K`; return num.toFixed(0); };

  // ─── Download helpers ───
  const downloadCSV = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const downloadImage = async (selector, filename) => {
    try {
      const el = document.querySelector(selector);
      if (!el) { toast.error("Element not found"); return; }
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, logging: false });
      canvas.toBlob((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); });
      toast.success("Downloaded!");
    } catch { toast.error("Download failed"); }
  };

  // ─── Hide / Restore ───
  const hideCard = (id) => { setHiddenCards(prev => new Set([...prev, id])); toast.success("Card hidden"); };
  const hideChart = (id) => { setHiddenCharts(prev => new Set([...prev, id])); toast.success("Chart hidden"); setDeleteDialog({ isOpen: false, chartId: null, chartType: null }); };
  const restoreAll = () => { setHiddenCards(new Set()); setHiddenCharts(new Set()); toast.success("All items restored"); };
  const hasHidden = hiddenCards.size > 0 || hiddenCharts.size > 0;

  // ─── See All handlers ───
  const openSeeAllPipeline = () => setSeeAllDialog({
    isOpen: true, title: `${labels.revenue} Pipeline - All ${labels.entities}`,
    data: pipelineData,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'value', label: labels.revenue, render: (r) => <CurrencyDisplay amount={r.value} compact /> },
      { key: 'percentage', label: 'Share', render: (r) => `${r.percentage}%` },
    ],
  });
  const openSeeAllTargets = () => setSeeAllDialog({
    isOpen: true, title: `${labels.revenue} Targets`,
    data: (stats?.restaurant_breakdown || []).map(r => ({ ...r, target: r.total * 1.8 })),
    columns: [
      { key: 'restaurant_name', label: labels.entity },
      { key: 'total', label: 'Current', render: (r) => <CurrencyDisplay amount={r.total} compact /> },
      { key: 'target', label: 'Target', render: (r) => <CurrencyDisplay amount={r.target} compact /> },
      { key: 'pct', label: '%', render: (r) => `${(r.total / r.target * 100).toFixed(0)}%` },
    ],
  });
  const openSeeAllTable = () => setSeeAllDialog({
    isOpen: true, title: `All ${labels.entities}`,
    data: stats?.restaurant_breakdown || [],
    columns: [
      { key: 'restaurant_name', label: 'Name' },
      { key: 'total', label: labels.revenue, render: (r) => <CurrencyDisplay amount={r.total} compact /> },
      { key: 'count', label: 'Entries', render: (r) => r.count || '-' },
    ],
  });

  if (!stats) return null;

  // ─── Render a KPI Card ───
  const renderKPICard = (cardId) => {
    if (hiddenCards.has(cardId)) return null;
    const cfg = cardConfigs[cardId] || {};
    const metricVal = getMetricValue(cfg.metric);
    const metricFmt = getMetricFormat(cfg.metric);
    const growth = getCardGrowth(cfg.metric);
    const gradient = GRADIENT_OPTIONS.find(g => g.id === cfg.gradient) || GRADIENT_OPTIONS[0];
    const isGrad = cfg.isGradient && gradient.id !== 'none';
    const IconComp = ICON_OPTIONS.find(i => i.id === cfg.icon)?.Icon || CircleDollarSign;

    return (
      <div
        key={cardId}
        className={`relative rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${
          isGrad
            ? `bg-gradient-to-br ${gradient.from} ${gradient.to} text-white shadow-lg ${gradient.shadow}`
            : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'
        }`}
        data-testid={`${cardId}-card`}
      >
        {/* Info/Menu button */}
        <div className="absolute top-4 right-4 opacity-40 hover:opacity-70 cursor-pointer transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={isGrad ? "text-white/60 hover:text-white" : "text-gray-400 hover:text-gray-600"}>
                <Info className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCardEditDialog({ isOpen: true, cardId })} className="gap-2">
                <Edit className="w-4 h-4" /> Customize Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const csv = `Metric,Value\n${cfg.title},${metricVal}\nGrowth,${growth.direction === 'up' ? '+' : '-'}${growth.value}%\n`;
                downloadCSV(`${cfg.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, csv);
              }} className="gap-2">
                <Download className="w-4 h-4" /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadImage(`[data-testid="${cardId}-card"]`, `${cfg.title}_${new Date().toISOString().split('T')[0]}.png`)} className="gap-2">
                <Download className="w-4 h-4" /> Download Image
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => hideCard(cardId)} className="gap-2 text-red-600">
                <EyeOff className="w-4 h-4" /> Hide Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isGrad ? 'bg-white/20 backdrop-blur' : 'bg-violet-50 dark:bg-violet-900/30'}`}>
          <IconComp className={`w-5 h-5 ${isGrad ? 'text-white' : 'text-violet-600'}`} />
        </div>

        {/* Label */}
        <p className={`text-sm font-medium mb-1 ${isGrad ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{cfg.title}</p>

        {/* Value + Growth */}
        <div className="flex items-end justify-between">
          <h2 className={`text-3xl font-bold tracking-tight ${isGrad ? '' : 'text-gray-900 dark:text-white'}`}>
            {metricFmt === 'currency' ? <CurrencyDisplay amount={metricVal} /> : metricVal.toLocaleString()}
          </h2>
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            isGrad
              ? growth.direction === 'up' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'
              : growth.direction === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-red-500 bg-red-50 dark:bg-red-900/30'
          }`}>
            {growth.direction === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {growth.value}%
            <span className={`text-xs ml-0.5 ${isGrad ? 'opacity-80' : 'text-gray-400'}`}>vs prior</span>
          </div>
        </div>
      </div>
    );
  };

  // ─── Bar chart rendering based on config type ───
  const renderBarChartArea = () => {
    const cfg = chartConfigs['bar-chart'] || {};
    const data = topRestaurants;
    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;

    const chartColor = cfg.color || BAR_COLOR;

    if (cfg.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="restaurant_name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(n) => n.length > 12 ? n.slice(0, 12) + '...' : n} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
            <Tooltip formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} />
            <Line type="monotone" dataKey="total" stroke={chartColor} strokeWidth={2.5} dot={{ fill: chartColor, r: 4 }} onClick={(d) => showDataDetail(d, "chart")} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (cfg.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="total" nameKey="restaurant_name" label={({ restaurant_name, percent }) => `${restaurant_name?.slice(0, 10)} ${(percent * 100).toFixed(0)}%`} onClick={(d) => showDataDetail(d, "chart")} style={{ cursor: "pointer" }}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    // Default: bar
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="restaurant_name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} interval={0} height={45} tickFormatter={(n) => n.length > 12 ? n.slice(0, 12) + '...' : n} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '10px 14px' }} formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} cursor={{ fill: 'rgba(124,58,237,0.04)' }} />
          <Bar dataKey="total" fill={chartColor} radius={[4, 4, 0, 0]} onClick={(d) => showDataDetail(d, "chart")} style={{ cursor: "pointer" }} label={{ position: 'top', fill: '#374151', fontSize: 12, fontWeight: 600, formatter: formatCompactNumber }} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ─── Line chart rendering based on config type ───
  const renderLineChartArea = () => {
    const cfg = chartConfigs['line-chart'] || {};
    const data = stats.date_wise_revenue.map(item => ({ ...item, date: formatDateDDMonYYYY(item.date) }));
    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
    const chartColor = cfg.color || '#7C3AED';

    if (cfg.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
            <Tooltip formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} />
            <Bar dataKey="total" fill={chartColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (cfg.type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.2} /><stop offset="95%" stopColor={chartColor} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
            <Tooltip formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} />
            <Area type="monotone" dataKey="total" stroke={chartColor} fill="url(#areaGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    // Default: line
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '10px 14px' }} formatter={(v) => [<CurrencyDisplay amount={v} />, labels.revenue]} />
          <Line type="monotone" dataKey="total" stroke={chartColor} strokeWidth={2.5} dot={{ fill: chartColor, r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: chartColor, stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // ═══ RENDER ═══
  return (
    <div className="space-y-6">

      {/* Restore hidden banner */}
      {hasHidden && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {hiddenCards.size + hiddenCharts.size} item(s) hidden
          </span>
          <Button variant="ghost" size="sm" onClick={restoreAll} className="gap-1.5 text-amber-700 dark:text-amber-300 hover:text-amber-900">
            <RotateCcw className="w-3.5 h-3.5" /> Restore All
          </Button>
        </div>
      )}

      {/* ROW 1: KPI Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {renderKPICard('total-revenue')}
        {renderKPICard('avg-revenue')}
        {renderKPICard('total-entries')}
      </div>

      {/* ROW 2: Bar Chart + Donut | Gauge */}
      <div className="grid gap-5 lg:grid-cols-5">
        {!hiddenCharts.has('bar-chart') && (
          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6" data-testid="restaurant-breakdown-chart">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {chartConfigs['bar-chart']?.title || `${labels.revenue} Volume`}
              </h3>
              <div className="flex items-center gap-2">
                {/* Owner/filter dropdown - FUNCTIONAL */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {barFilterRestaurant === 'all' ? 'All' : barFilterRestaurant.slice(0, 15)}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                    <DropdownMenuItem onClick={() => setBarFilterRestaurant("all")}>All {labels.entities}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(stats.restaurant_breakdown || []).map((r) => (
                      <DropdownMenuItem key={r.restaurant_name} onClick={() => setBarFilterRestaurant(r.restaurant_name)}>
                        {r.restaurant_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Filter: sort & count */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Filter className="w-3 h-3" /> Filter
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setBarSortOrder("desc")}>Sort: High → Low {barSortOrder === 'desc' && '✓'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBarSortOrder("asc")}>Sort: Low → High {barSortOrder === 'asc' && '✓'}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {[3, 5, 8, 10].map(n => (
                      <DropdownMenuItem key={n} onClick={() => setBarShowCount(n)}>Show top {n} {barShowCount === n && '✓'}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Settings: chart type */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Settings className="w-3 h-3" /> Setting
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditDialog({ isOpen: true, chartId: 'bar-chart', chartType: 'Bar Chart' })} className="gap-2"><Edit className="w-4 h-4" /> Edit Title & Color</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {['bar', 'line', 'pie'].map(t => (
                      <DropdownMenuItem key={t} onClick={() => setChartConfigs({ ...chartConfigs, 'bar-chart': { ...chartConfigs['bar-chart'], type: t } })}>
                        {t.charAt(0).toUpperCase() + t.slice(1)} Chart {chartConfigs['bar-chart']?.type === t && '✓'}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { downloadCSV('revenue_chart.csv', `Name,Revenue\n${topRestaurants.map(r => `"${r.restaurant_name}",${r.total}`).join('\n')}`); }} className="gap-2"><Download className="w-4 h-4" /> Download CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadImage('[data-testid="restaurant-breakdown-chart"]', 'revenue_chart.png')} className="gap-2"><Download className="w-4 h-4" /> Download Image</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => hideChart("bar-chart")} className="gap-2 text-red-600"><EyeOff className="w-4 h-4" /> Hide</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">{renderBarChartArea()}</div>
              <div className="hidden md:flex flex-col items-center justify-center border-l border-gray-100 dark:border-gray-800 pl-6 min-w-[140px]">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-3">
                  <TrendingUp className="w-7 h-7 text-violet-400" />
                </div>
                <ConversionDonut
                  value={stats.restaurant_breakdown.length > 0 ? Math.round((topRestaurants[0]?.total || 0) / (stats.total_revenue || 1) * 100) : 0}
                  label="Top Contributor"
                />
              </div>
            </div>
          </div>
        )}

        {/* Gauge */}
        {!hiddenCharts.has('gauge-chart') && (
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6" data-testid="revenue-target-chart">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{labels.revenue} Target</h3>
              <button onClick={openSeeAllTargets} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                See all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <GaugeChart value={stats.total_revenue} target={stats.total_revenue * 1.8 || 100000} />
          </div>
        )}
      </div>

      {/* ROW 3: Pipeline | Table */}
      <div className="grid gap-5 lg:grid-cols-5">
        {!hiddenCharts.has('pipeline') && (
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6" data-testid="revenue-pipeline">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{labels.revenue} Pipeline</h3>
              <button onClick={openSeeAllPipeline} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                See all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4"><CurrencyDisplay amount={stats.total_revenue} /></h2>
            <PipelineBar data={pipelineData} colors={COLORS} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-5">
              {pipelineData.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white ml-auto">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table with column customization */}
        {!hiddenCharts.has('contact-list') && (
          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 overflow-hidden" data-testid="restaurant-list-table">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{labels.entity} List</h3>
              <div className="flex items-center gap-2">
                {/* Column settings */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                      <Settings className="w-3 h-3" /> Columns
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries({ name: 'Name', type: 'Type', revenue: labels.revenue, share: 'Share %', priority: 'Priority', entries: 'Entries', brand: 'Brand' }).map(([key, label]) => (
                      <DropdownMenuCheckboxItem key={key} checked={tableVisibleCols[key]} onCheckedChange={(v) => setTableVisibleCols({ ...tableVisibleCols, [key]: v })}>
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button onClick={openSeeAllTable} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  See all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {tableVisibleCols.name && <th className="text-left py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>}
                    {tableVisibleCols.type && <th className="text-left py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>}
                    {tableVisibleCols.brand && <th className="text-left py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand</th>}
                    {tableVisibleCols.revenue && <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{labels.revenue}</th>}
                    {tableVisibleCols.entries && <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entries</th>}
                    {tableVisibleCols.share && <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Share</th>}
                    {tableVisibleCols.priority && <th className="text-center py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</th>}
                  </tr>
                </thead>
                <tbody>
                  {topRestaurants.map((restaurant, index) => {
                    const share = stats.total_revenue > 0 ? ((restaurant.total / stats.total_revenue) * 100).toFixed(0) : 0;
                    const priority = share >= 30 ? "High" : share >= 15 ? "Medium" : "Low";
                    const priorityColor = priority === "High" ? "bg-red-50 text-red-600 dark:bg-red-900/30" : priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30";
                    return (
                      <tr key={index} className="border-b border-gray-50 dark:border-gray-800 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors cursor-pointer" onClick={() => showDataDetail(restaurant, "chart")}>
                        {tableVisibleCols.name && <td className="py-3.5 px-2"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}>{restaurant.restaurant_name?.charAt(0)?.toUpperCase() || '?'}</div><span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{restaurant.restaurant_name}</span></div></td>}
                        {tableVisibleCols.type && <td className="py-3.5 px-2 text-gray-500 dark:text-gray-400">{labels.entity}</td>}
                        {tableVisibleCols.brand && <td className="py-3.5 px-2 text-gray-500 dark:text-gray-400">{restaurant.brand || '-'}</td>}
                        {tableVisibleCols.revenue && <td className="py-3.5 px-2 text-right"><span className="font-semibold text-gray-900 dark:text-white"><CurrencyDisplay amount={restaurant.total} compact /></span></td>}
                        {tableVisibleCols.entries && <td className="py-3.5 px-2 text-right text-gray-700 dark:text-gray-300">{restaurant.count || '-'}</td>}
                        {tableVisibleCols.share && <td className="py-3.5 px-2 text-right"><div className="flex items-center justify-end gap-1"><span className="font-medium text-gray-700 dark:text-gray-300">{share}%</span><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /></div></td>}
                        {tableVisibleCols.priority && <td className="py-3.5 px-2 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColor}`}>{priority}</span></td>}
                      </tr>
                    );
                  })}
                  {topRestaurants.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No data available</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ROW 4: Line Chart */}
      {!hiddenCharts.has('line-chart') && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6" data-testid="date-wise-chart">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{chartConfigs['line-chart']?.title || `Daily ${labels.revenue}`}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><MoreVertical className="w-4 h-4" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialog({ isOpen: true, chartId: 'line-chart', chartType: 'Line Chart' })} className="gap-2"><Edit className="w-4 h-4" /> Edit Title & Color</DropdownMenuItem>
                <DropdownMenuSeparator />
                {['line', 'bar', 'area'].map(t => (
                  <DropdownMenuItem key={t} onClick={() => setChartConfigs({ ...chartConfigs, 'line-chart': { ...chartConfigs['line-chart'], type: t } })}>
                    {t.charAt(0).toUpperCase() + t.slice(1)} Chart {chartConfigs['line-chart']?.type === t && '✓'}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { downloadCSV('daily_revenue.csv', `Date,Revenue\n${stats.date_wise_revenue.map(d => `${d.date},${d.total}`).join('\n')}`); }} className="gap-2"><Download className="w-4 h-4" /> Download CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadImage('[data-testid="date-wise-chart"]', 'daily_revenue.png')} className="gap-2"><Download className="w-4 h-4" /> Download Image</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => hideChart("line-chart")} className="gap-2 text-red-600"><EyeOff className="w-4 h-4" /> Hide</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {renderLineChartArea()}
        </div>
      )}

      <StatCardManager stats={stats} employeeStats={employeeStats} onUpdate={onUpdateStats} />

      {/* ─── DIALOGS ─── */}

      {/* Card Edit Dialog */}
      <Dialog open={cardEditDialog.isOpen} onOpenChange={(o) => !o && setCardEditDialog({ isOpen: false, cardId: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize KPI Card</DialogTitle>
            <DialogDescription>Configure what this card displays, its title, icon, and colors</DialogDescription>
          </DialogHeader>
          {cardEditDialog.cardId && (() => {
            const cfg = cardConfigs[cardEditDialog.cardId] || {};
            const updateCfg = (patch) => setCardConfigs({ ...cardConfigs, [cardEditDialog.cardId]: { ...cfg, ...patch } });
            return (
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label>Card Title</Label>
                  <Input value={cfg.title || ''} onChange={(e) => updateCfg({ title: e.target.value })} placeholder="Card title" />
                </div>
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select value={cfg.metric || 'total_revenue'} onValueChange={(v) => updateCfg({ metric: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METRIC_OPTIONS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(opt => {
                      const I = opt.Icon;
                      return (
                        <button key={opt.id} onClick={() => updateCfg({ icon: opt.id })} className={`p-2.5 rounded-lg border transition-colors ${cfg.icon === opt.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`} title={opt.label}>
                          <I className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Gradient Background</Label>
                    <Switch checked={cfg.isGradient || false} onCheckedChange={(v) => updateCfg({ isGradient: v, gradient: v ? (cfg.gradient === 'none' ? 'violet' : cfg.gradient) : 'none' })} />
                  </div>
                  {cfg.isGradient && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {GRADIENT_OPTIONS.filter(g => g.id !== 'none').map(g => (
                        <button key={g.id} onClick={() => updateCfg({ gradient: g.id })} className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r ${g.from} ${g.to} ${cfg.gradient === g.id ? 'ring-2 ring-offset-2 ring-violet-500' : 'opacity-70 hover:opacity-100'}`}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCardEditDialog({ isOpen: false, cardId: null })}>Done</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Chart Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(o) => !o && setEditDialog({ isOpen: false, chartId: null, chartType: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editDialog.chartType}</DialogTitle>
            <DialogDescription>Customize the chart title and appearance</DialogDescription>
          </DialogHeader>
          {editDialog.chartId && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Chart Title</Label>
                <Input value={chartConfigs[editDialog.chartId]?.title || ''} onChange={(e) => setChartConfigs({ ...chartConfigs, [editDialog.chartId]: { ...chartConfigs[editDialog.chartId], title: e.target.value } })} placeholder="Enter chart title" />
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Input type="color" value={chartConfigs[editDialog.chartId]?.color || '#7C3AED'} onChange={(e) => setChartConfigs({ ...chartConfigs, [editDialog.chartId]: { ...chartConfigs[editDialog.chartId], color: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select value={chartConfigs[editDialog.chartId]?.type || 'bar'} onValueChange={(v) => setChartConfigs({ ...chartConfigs, [editDialog.chartId]: { ...chartConfigs[editDialog.chartId], type: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, chartId: null, chartType: null })}>Cancel</Button>
                <Button onClick={() => { toast.success("Saved!"); setEditDialog({ isOpen: false, chartId: null, chartType: null }); }} className="bg-violet-600 hover:bg-violet-700">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* See All Dialog */}
      <SeeAllDialog open={seeAllDialog.isOpen} onClose={() => setSeeAllDialog({ ...seeAllDialog, isOpen: false })} title={seeAllDialog.title} data={seeAllDialog.data} columns={seeAllDialog.columns} />

      {/* Data Detail Popup */}
      <DataDetailPopup isOpen={detailPopup.isOpen} onClose={() => setDetailPopup({ isOpen: false, data: null, type: "general" })} data={detailPopup.data} type={detailPopup.type} />
    </div>
  );
};

export default DashboardStats;
