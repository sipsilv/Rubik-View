"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Activity,
    Zap,
    BarChart3,
    LayoutGrid,
    Table2,
    CalendarDays,
    Gauge,
    ArrowUpCircle,
    ArrowDownCircle,
} from "lucide-react";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StockPick {
    symbol: string;
    score: number;
    signal: string;
    raw_score: number;
}

type ViewMode = "grid" | "table";

const ExcelGrid = ({ data }: { data: StockPick[] }) => {
    const columns = ["Symbol", "Score", "Signal", "Raw Score"];
    return (
        <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner shadow-slate-900/40">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/80">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column}
                                className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400 text-xs"
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/70">
                    {data.map((row) => (
                        <tr key={row.symbol} className="hover:bg-slate-900/40">
                            <td className="px-4 py-3 font-semibold text-white">{row.symbol}</td>
                            <td className="px-4 py-3 text-slate-200">{row.score.toFixed(2)}</td>
                            <td className="px-4 py-3">
                                <span
                                    className={cn(
                                        "px-2 py-1 rounded-full text-xs font-semibold",
                                        row.signal.includes("Bullish")
                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                            : row.signal.includes("Bearish")
                                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                            : "bg-slate-700/40 text-slate-200 border border-slate-600/40"
                                    )}
                                >
                                    {row.signal}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{row.raw_score.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function DashboardPage() {
    const [picks, setPicks] = useState<StockPick[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");

    useEffect(() => {
        const fetchPicks = async () => {
            try {
                const response = await api.get("/analysis/top-picks?limit=20");
                setPicks(response.data);
            } catch (err) {
                console.error("Failed to fetch picks", err);
                setError("Failed to load top picks. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchPicks();
    }, []);

    const computedStats = useMemo(() => {
        const bullish = picks.filter((pick) => pick.signal.includes("Bullish")).length;
        const bearish = picks.filter((pick) => pick.signal.includes("Bearish")).length;
        const neutral = picks.length - bullish - bearish;
        const topScore = picks[0]?.score ?? 0;
        const lastUpdated = new Date().toLocaleString();
        return { bullish, bearish, neutral, topScore, lastUpdated };
    }, [picks]);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 pl-72 space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase text-slate-500 tracking-[0.4em]">Markets</p>
                    <h1 className="text-3xl font-bold mt-1">Live Excel Grid</h1>
                    <p className="text-slate-400 text-sm">Mirror the workbook layout with compact cards and data grids.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant={viewMode === "grid" ? "default" : "secondary"}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2",
                            viewMode === "grid" ? "bg-sky-500 hover:bg-sky-400" : "bg-slate-800 hover:bg-slate-700"
                        )}
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Grid View
                    </Button>
                    <Button
                        variant={viewMode === "table" ? "default" : "secondary"}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2",
                            viewMode === "table" ? "bg-sky-500 hover:bg-sky-400" : "bg-slate-800 hover:bg-slate-700"
                        )}
                        onClick={() => setViewMode("table")}
                    >
                        <Table2 className="h-4 w-4" />
                        Table View
                    </Button>
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase text-slate-500">
                        <span>Total Symbols</span>
                        <Activity className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-3xl font-bold">{picks.length || 0}</p>
                    <p className="text-xs text-slate-500">Tracked in latest run</p>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase text-slate-500">
                        <span>Bullish</span>
                        <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-300">{computedStats.bullish}</p>
                    <p className="text-xs text-slate-500">Signals favoring upside</p>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase text-slate-500">
                        <span>Bearish</span>
                        <ArrowDownCircle className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="text-3xl font-bold text-rose-300">{computedStats.bearish}</p>
                    <p className="text-xs text-slate-500">Downside risk alerts</p>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase text-slate-500">
                        <span>Last Sync</span>
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-lg font-semibold text-slate-100">{computedStats.lastUpdated}</p>
                    <p className="text-xs text-slate-500">Follows Excel run cadence</p>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-sky-400" />
                            <h2 className="text-xl font-semibold">AI Picks (Excel Grid Mode)</h2>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-slate-500" />
                            <span>Top score: {computedStats.topScore.toFixed(2)}</span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                        </div>
                    ) : error ? (
                        <div className="text-center p-8 glass-panel rounded-xl border border-red-500/30">
                            <p className="text-red-300">{error}</p>
                        </div>
                    ) : viewMode === "table" ? (
                        <StockTable data={picks} />
                    ) : (
                        <ExcelGrid data={picks} />
                    )}
                </div>
                <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <h3 className="text-lg font-semibold">Signal Mix</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Neutral</span>
                            <span className="text-slate-100">{computedStats.neutral}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Bullish Momentum</span>
                            <span className="text-emerald-300">{computedStats.bullish}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Bearish Pressure</span>
                            <span className="text-rose-300">{computedStats.bearish}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-2 text-xs text-slate-400">
                        <p className="font-semibold text-slate-200">Tips</p>
                        <ul className="space-y-1">
                            <li>• Grid view mirrors Excel tables for quick audits.</li>
                            <li>• Switch to table view for sortable data.</li>
                            <li>• Keep the admin console running to refresh market data.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
