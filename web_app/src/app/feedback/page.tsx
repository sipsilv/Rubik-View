"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    MessageSquarePlus,
    Lightbulb,
    Bug,
    Send,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RubikLoader } from "@/components/RubikLoader";
import SimpleSpinner from "@/components/SimpleSpinner";

type FeedbackType = "feedback" | "feature_request" | "bug_report";

type FeedbackItem = {
    id: number;
    feedback_type: FeedbackType;
    title: string;
    description?: string;
    status: string;
    admin_notes?: string;
    created_at: string;
};

type MessageState = { type: "success" | "error"; text: string } | null;

const feedbackTypes = [
    { value: "feedback" as FeedbackType, label: "General Feedback", icon: MessageSquarePlus, color: "text-sky-400" },
    { value: "feature_request" as FeedbackType, label: "Feature Request", icon: Lightbulb, color: "text-amber-400" },
    { value: "bug_report" as FeedbackType, label: "Bug Report", icon: Bug, color: "text-rose-400" },
];

const statusColors: Record<string, string> = {
    pending: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    reviewed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function FeedbackPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<MessageState>(null);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

    const [selectedType, setSelectedType] = useState<FeedbackType>("feedback");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        fetchFeedback();
    }, [router]);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const response = await api.get("/auth/feedback");
            setFeedbackList(response.data);
        } catch (error) {
            console.error("Failed to load feedback", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setMessage({ type: "error", text: "Please enter a title." });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            await api.post("/auth/feedback", {
                feedback_type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
            });
            setMessage({ type: "success", text: "Thank you! Your feedback has been submitted." });
            setTitle("");
            setDescription("");
            fetchFeedback();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Failed to submit feedback.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <RubikLoader label="Loading feedback..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/30">
                            <MessageSquarePlus className="h-8 w-8 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Share Your Thoughts</p>
                            <h1 className="text-3xl font-bold">Feedback & Requests</h1>
                            <p className="text-slate-400 text-sm">Help us improve Rubik View with your suggestions.</p>
                        </div>
                    </div>
                </header>

                {/* Submit Form */}
                <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
                    <h2 className="text-lg font-semibold">Submit New Feedback</h2>

                    {message && (
                        <div
                            className={cn(
                                "rounded-lg border px-4 py-3 text-sm",
                                message.type === "success"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                            )}
                        >
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Selection */}
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-2 block">Type</label>
                            <div className="flex gap-3">
                                {feedbackTypes.map((ft) => {
                                    const Icon = ft.icon;
                                    const isSelected = selectedType === ft.value;
                                    return (
                                        <button
                                            key={ft.value}
                                            type="button"
                                            onClick={() => setSelectedType(ft.value)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                                                isSelected
                                                    ? "bg-slate-800 border-slate-600 text-white"
                                                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                            )}
                                        >
                                            <Icon className={cn("h-4 w-4", ft.color)} />
                                            {ft.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Brief summary of your feedback"
                                className="bg-slate-900/50 border-slate-800"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Description (optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide more details about your feedback, feature request, or bug..."
                                rows={4}
                                className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-violet-600 hover:bg-violet-500 flex items-center gap-2"
                        >
                            {submitting ? (
                                <SimpleSpinner size={16} />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Submit Feedback
                        </Button>
                    </form>
                </section>

                {/* My Feedback List */}
                <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">My Submissions</h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-slate-800 hover:bg-slate-700"
                            onClick={fetchFeedback}
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                    </div>

                    {feedbackList.length === 0 ? (
                        <p className="text-slate-500 text-sm">You haven't submitted any feedback yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {feedbackList.map((item) => {
                                const typeInfo = feedbackTypes.find((t) => t.value === item.feedback_type);
                                const Icon = typeInfo?.icon ?? MessageSquarePlus;
                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn("h-4 w-4", typeInfo?.color ?? "text-slate-400")} />
                                                <span className="font-semibold text-white">{item.title}</span>
                                            </div>
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                                    statusColors[item.status] ?? statusColors.pending
                                                )}
                                            >
                                                {item.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        {item.description && (
                                            <p className="text-sm text-slate-400">{item.description}</p>
                                        )}
                                        {item.admin_notes && (
                                            <div className="mt-2 rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-2">
                                                <p className="text-xs uppercase text-slate-500 mb-1">Admin Response</p>
                                                <p className="text-sm text-slate-300">{item.admin_notes}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-600">
                                            {new Date(item.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

