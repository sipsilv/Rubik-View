"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StockPick {
    symbol: string;
    score: number;
    signal: string;
    raw_score: number;
}

interface StockTableProps {
    data: StockPick[];
}

export default function StockTable({ data }: StockTableProps) {
    const getSignalColor = (signal: string) => {
        if (signal.includes("Bullish")) return "text-emerald-400";
        if (signal.includes("Bearish")) return "text-rose-400";
        return "text-slate-400";
    };

    const getSignalIcon = (signal: string) => {
        if (signal.includes("Bullish")) return <TrendingUp className="h-3 w-3" />;
        if (signal.includes("Bearish")) return <TrendingDown className="h-3 w-3" />;
        return <Minus className="h-3 w-3" />;
    };

    return (
        <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">Symbol</th>
                            <th className="px-4 py-3 font-medium">Signal</th>
                            <th className="px-4 py-3 font-medium text-right">Score</th>
                            <th className="px-4 py-3 font-medium text-right">Raw Score</th>
                            <th className="px-4 py-3 font-medium text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {data.map((item) => (
                            <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-4 py-2 font-mono font-medium text-white group-hover:text-sky-400 transition-colors">
                                    {item.symbol}
                                </td>
                                <td className="px-4 py-2">
                                    <div className={`flex items-center gap-1.5 ${getSignalColor(item.signal)}`}>
                                        {getSignalIcon(item.signal)}
                                        <span>{item.signal}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-slate-300">
                                    {item.score}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-slate-500">
                                    {item.raw_score.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button className="text-xs bg-sky-500/10 text-sky-400 px-2 py-1 rounded hover:bg-sky-500/20 transition-colors">
                                        Analyze
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
