"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import StockChart from "@/components/Chart";
import { Loader2 } from "lucide-react";

interface HistoryItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export default function StockDetailPage() {
    const params = useParams();
    const symbol = params.symbol as string;
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get(`/stocks/${symbol}/history?limit=200`);
                setHistory(response.data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };

        if (symbol) {
            fetchHistory();
        }
    }, [symbol]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{decodeURIComponent(symbol)}</h1>
                <p className="text-muted-foreground">
                    Historical price data and analysis.
                </p>
            </div>

            <StockChart data={history} symbol={decodeURIComponent(symbol)} />
        </div>
    );
}
