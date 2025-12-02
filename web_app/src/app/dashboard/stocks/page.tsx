"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { RubikLoader } from "@/components/RubikLoader";

export default function StocksPage() {
    const [stocks, setStocks] = useState<string[]>([]);
    const [filteredStocks, setFilteredStocks] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const response = await api.get("/stocks/");
                setStocks(response.data);
                setFilteredStocks(response.data);
            } catch (err) {
                console.error("Failed to fetch stocks", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStocks();
    }, []);

    useEffect(() => {
        const filtered = stocks.filter((s) =>
            s.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredStocks(filtered);
    }, [search, stocks]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
                <p className="text-muted-foreground">
                    Browse all available stocks.
                </p>
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search stocks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Stocks ({filteredStocks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <RubikLoader label="Loading stocks..." size="md" />
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredStocks.slice(0, 100).map((symbol) => (
                                <Link
                                    key={symbol}
                                    href={`/dashboard/stocks/${symbol}`}
                                    className="flex items-center justify-center p-4 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    {symbol}
                                </Link>
                            ))}
                            {filteredStocks.length > 100 && (
                                <div className="col-span-full text-center text-muted-foreground pt-4">
                                    Showing first 100 results. Use search to find more.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
