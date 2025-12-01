"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartProps {
    data: { date: string; close: number }[];
    symbol: string;
}

export default function StockChart({ data, symbol }: ChartProps) {
    // Format data for chart
    const chartData = data.map((item) => ({
        date: item.date,
        close: item.close,
    })).reverse(); // Recharts expects chronological order

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>{symbol} Price History</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value}`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                                labelStyle={{ color: "var(--foreground)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="close"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
