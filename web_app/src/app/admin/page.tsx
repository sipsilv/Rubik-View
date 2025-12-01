"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Shield,
    Users,
    Database,
    Activity,
    RefreshCw,
    Download,
    AlertTriangle,
    Terminal,
    Bell,
    ClipboardList,
    Plus,
    X,
    Loader2,
    FileBarChart,
    Clock,
    Send,
    Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { RubikLoader } from "@/components/RubikLoader";

type UserRecord = {
    id: number;
    email: string;
    full_name?: string;
    role: string;
    phone_number?: string;
    state?: string;
    country?: string;
    is_active: boolean;
};

type ChangeRequest = {
    id: number;
    request_type: string;
    status: string;
    details?: string;
    created_at: string;
    user?: {
        email: string;
        full_name?: string;
    };
};

type AdminJob = {
    id: number;
    job_type: "ohlcv_load" | "signal_process";
    status: string;
    triggered_by: string;
    started_at?: string;
    finished_at?: string;
};

type MessageState = { type: "success" | "error"; text: string } | null;

type CreateForm = {
    email: string;
    password: string;
    role: string;
    full_name: string;
    phone_number: string;
    state: string;
    country: string;
    city: string;
    postal_code: string;
    telegram_chat_id: string;
};

const jobMeta = {
    ohlcv_load: {
        title: "Load OHCLV Data",
        description: "Run the Excel-backed OHLCV loader and update duckDB.",
        icon: Database,
        accent: "text-sky-300",
    },
    signal_process: {
        title: "Process Signal Data",
        description: "Calculate indicator signals and score rankings.",
        icon: Activity,
        accent: "text-emerald-300",
    },
};

const SUPER_ADMIN_EMAIL = "jallusandeep@rubikview.com";

export default function AdminPage() {
    const router = useRouter();
    const sidebarCollapsed = useSidebarCollapsed();
    const [accessLoading, setAccessLoading] = useState(true);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [jobs, setJobs] = useState<AdminJob[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
    const [jobAction, setJobAction] = useState<string | null>(null);
    const [jobMessage, setJobMessage] = useState<MessageState>(null);
    const [stoppingJobId, setStoppingJobId] = useState<number | null>(null);
    const [showCreateDrawer, setShowCreateDrawer] = useState(false);
    const [createMessage, setCreateMessage] = useState<MessageState>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [userMessage, setUserMessage] = useState<MessageState>(null);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [notifyingUserId, setNotifyingUserId] = useState<number | null>(null);
    type OhlcvStatus = {
        job_id?: number | null;
        status: string;
        started_at?: string | null;
        finished_at?: string | null;
        total_symbols: number;
        processed_symbols: number;
        success: number;
        failed: number;
        skipped: number;
        uptodate: number;
        last_symbol?: string | null;
        last_message?: string | null;
        percent_complete: number;
    };

    type SignalStatus = {
        job_id?: number | null;
        status: string;
        started_at?: string | null;
        finished_at?: string | null;
        total_symbols: number;
        processed_symbols: number;
        processed: number;
        uptodate: number;
        skipped: number;
        errors: number;
        last_symbol?: string | null;
        last_message?: string | null;
        percent_complete: number;
    };

    const [ohlcvStatus, setOhlcvStatus] = useState<OhlcvStatus | null>(null);
    const [signalStatus, setSignalStatus] = useState<SignalStatus | null>(null);
    const [logViewer, setLogViewer] = useState<{ open: boolean; loading: boolean; jobId?: number; content: string | null; error?: string }>({
        open: false,
        loading: false,
        jobId: undefined,
        content: null,
    });
    const [createForm, setCreateForm] = useState<CreateForm>({
        email: "",
        password: "",
        role: "user",
        full_name: "",
        phone_number: "",
        state: "",
        country: "",
        city: "",
        postal_code: "",
        telegram_chat_id: "",
    });

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "admin" && role !== "superadmin") {
            router.push("/dashboard");
        } else {
            setAccessLoading(false);
        }
    }, [router]);

    const fetchUsers = async () => {
        try {
            const response = await api.get("/auth/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to load users", error);
        }
    };

    const fetchJobs = async () => {
        try {
            const response = await api.get("/admin/jobs");
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to load jobs", error);
        }
    };

    const fetchOhlcvStatus = async () => {
        try {
            const response = await api.get("/admin/ohlcv/status");
            setOhlcvStatus(response.data);
        } catch (error) {
            console.error("Failed to load OHCLV status", error);
        }
    };

    const fetchSignalStatus = async () => {
        try {
            const response = await api.get("/admin/signals/status");
            setSignalStatus(response.data);
        } catch (error) {
            console.error("Failed to load signal status", error);
        }
    };

    const fetchChangeRequests = async () => {
        try {
            const response = await api.get("/auth/change-requests");
            setChangeRequests(response.data);
        } catch (error) {
            console.error("Failed to load change requests", error);
        }
    };

    useEffect(() => {
        if (accessLoading) return;
        fetchUsers();
        fetchJobs();
        fetchOhlcvStatus();
        fetchSignalStatus();
        fetchChangeRequests();
        const interval = setInterval(() => {
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        }, 5000); // refresh every 5s for more real-time feel
        return () => clearInterval(interval);
    }, [accessLoading]);

    const latestJobs = useMemo(() => {
        const map: Record<string, AdminJob | undefined> = {};
        jobs.forEach((job) => {
            if (!map[job.job_type]) {
                map[job.job_type] = job;
            }
        });
        return map;
    }, [jobs]);

    const handleTriggerJob = async (type: AdminJob["job_type"]) => {
        setJobAction(type);
        setJobMessage(null);
        try {
            await api.post(`/admin/jobs/${type}`);
            setJobMessage({ type: "success", text: `${jobMeta[type].title} started.` });
            fetchJobs();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setJobMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to start job.",
            });
        } finally {
            setJobAction(null);
        }
    };

    const handleStopJob = async (jobId: number) => {
        setStoppingJobId(jobId);
        setJobMessage(null);
        try {
            await api.post(`/admin/jobs/${jobId}/stop`);
            setJobMessage({ type: "success", text: "Job stop requested." });
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setJobMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to stop job.",
            });
        } finally {
            setStoppingJobId(null);
        }
    };

    const handleStopAllJobs = async () => {
        setStoppingJobId(-1);
        setJobMessage(null);

        const ids: number[] = [];
        if (ohlcvStatus?.job_id && ohlcvStatus.status === "running") {
            ids.push(ohlcvStatus.job_id);
        }
        if (signalStatus?.job_id && signalStatus.status === "running") {
            ids.push(signalStatus.job_id);
        }

        if (ids.length === 0) {
            setStoppingJobId(null);
            setJobMessage({ type: "error", text: "No running jobs to stop." });
            return;
        }

        try {
            for (const id of ids) {
                await api.post(`/admin/jobs/${id}/stop`);
            }
            setJobMessage({ type: "success", text: "Stop requested for all running jobs." });
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setJobMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to stop jobs.",
            });
        } finally {
            setStoppingJobId(null);
        }
    };

    const handleViewLog = async (jobId: number) => {
        setLogViewer({ open: true, loading: true, jobId, content: null });
        try {
            const response = await api.get(`/admin/jobs/${jobId}/log`, { responseType: "text" as const });
            setLogViewer({ open: true, loading: false, jobId, content: response.data });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setLogViewer({
                open: true,
                loading: false,
                jobId,
                content: null,
                error: err.response?.data?.detail ?? "Unable to load log.",
            });
        }
    };

    const handleCreateUser = async (event: React.FormEvent) => {
        event.preventDefault();
        setCreatingUser(true);
        setCreateMessage(null);
        try {
            const payload = {
                ...createForm,
                full_name: createForm.full_name || undefined,
                phone_number: createForm.phone_number || undefined,
                state: createForm.state || undefined,
                country: createForm.country || undefined,
                city: createForm.city || undefined,
                postal_code: createForm.postal_code || undefined,
                telegram_chat_id: createForm.telegram_chat_id || undefined,
            };
            await api.post("/auth/users", payload);
            setCreateMessage({ type: "success", text: "User created successfully." });
            setCreateForm({
                email: "",
                password: "",
                role: "user",
                full_name: "",
                phone_number: "",
                state: "",
                country: "",
                city: "",
                postal_code: "",
                telegram_chat_id: "",
            });
            fetchUsers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setCreateMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to create user.",
            });
        } finally {
            setCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        setDeletingUserId(userId);
        setUserMessage(null);
        try {
            await api.delete(`/auth/users/${userId}`);
            setUsers((prev) => prev.filter((user) => user.id !== userId));
            setUserMessage({ type: "success", text: "User deleted." });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to delete user.",
            });
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleNotifyUser = async (user: UserRecord) => {
        const promptMessage = window.prompt(
            `Enter the message to send to ${user.email} via Telegram.`,
            `Hello ${user.full_name ?? ""}, your Rubik View credentials are ready.`
        );
        if (!promptMessage) {
            return;
        }
        setNotifyingUserId(user.id);
        setUserMessage(null);
        try {
            const response = await api.post(`/auth/users/${user.id}/notify`, { message: promptMessage });
            setUserMessage({
                type: "success",
                text: response.data.delivered ? "Message delivered via Telegram." : "Telegram not configured; message logged.",
            });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to send Telegram message.",
            });
        } finally {
            setNotifyingUserId(null);
        }
    };

    if (accessLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <RubikLoader label="Rubik is opening admin console…" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "min-h-screen bg-slate-900 text-white p-8 transition-all duration-300",
                sidebarCollapsed ? "pl-24" : "pl-72",
            )}
        >
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/30">
                            <Shield className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Control Room</p>
                            <h1 className="text-3xl font-bold">Admin Console</h1>
                            <p className="text-slate-400 text-sm">Monitor loads, signal pipelines, and account change requests.</p>
                    </div>
                </div>
                    <div className="flex gap-3">
                        <Button className="bg-sky-500 hover:bg-sky-400 flex items-center gap-2" onClick={() => setShowCreateDrawer(true)}>
                            <Plus className="h-4 w-4" />
                            Create User
                        </Button>
                        <Button variant="secondary" className="bg-slate-800 hover:bg-slate-700 flex items-center gap-2" onClick={fetchJobs}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-sky-300" />
                                    <div>
                                    <h3 className="text-lg font-semibold">Load OHCLV Data</h3>
                                    <p className="text-xs text-slate-500">Backend loader writing directly into duckDB.</p>
                                    </div>
                                </div>
                            {ohlcvStatus && (
                                <span
                                    className={cn(
                                        "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                        ohlcvStatus.status === "completed"
                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                            : ohlcvStatus.status === "running"
                                            ? "bg-sky-500/15 text-sky-200 border border-sky-500/30"
                                            : ohlcvStatus.status === "failed"
                                            ? "bg-rose-500/15 text-rose-200 border border-rose-500/30"
                                            : "bg-slate-800 text-slate-300 border border-slate-700"
                                    )}
                                >
                                    {ohlcvStatus.status.toUpperCase()}
                                </span>
                            )}
                        </div>
                        {ohlcvStatus && (
                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span>Total Symbols</span>
                                        <span className="font-semibold">{ohlcvStatus.total_symbols}</span>
                            </div>
                                    <div className="flex items-center justify-between">
                                        <span>Processed</span>
                                        <span className="font-semibold">{ohlcvStatus.processed_symbols}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Progress</span>
                                        <span className="font-semibold">{ohlcvStatus.percent_complete.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-emerald-300">Success</span>
                                        <span className="font-semibold text-emerald-300">{ohlcvStatus.success}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-yellow-300">Up to date</span>
                                        <span className="font-semibold text-yellow-300">{ohlcvStatus.uptodate}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">Skipped</span>
                                        <span className="font-semibold">{ohlcvStatus.skipped}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-rose-300">Failed</span>
                                        <span className="font-semibold text-rose-300">{ohlcvStatus.failed}</span>
                            </div>
                        </div>
                    </div>
                        )}
                        <div className="flex items-center justify-end gap-2 mt-3">
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 px-4"
                                onClick={() => handleTriggerJob("ohlcv_load")}
                                disabled={jobAction !== null || ohlcvStatus?.status === "running"}
                            >
                                {jobAction === "ohlcv_load" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-1" />
                                        Run OHCLV
                                    </>
                                )}
                            </Button>
                            {ohlcvStatus?.job_id && ohlcvStatus.status === "running" && (
                                <Button
                                    variant="destructive"
                                    className="bg-rose-600 hover:bg-rose-500 px-4"
                                    onClick={() => handleStopJob(ohlcvStatus.job_id!)}
                                    disabled={stoppingJobId === ohlcvStatus.job_id}
                                >
                                    {stoppingJobId === ohlcvStatus.job_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Stop"
                                    )}
                                </Button>
                            )}
                            {latestJobs.ohlcv_load && (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-slate-900 hover:bg-slate-800"
                                    onClick={() => handleViewLog(latestJobs.ohlcv_load!.id)}
                                >
                                    <Terminal className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {ohlcvStatus?.last_message && (
                            <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="uppercase tracking-wide text-slate-500">Live status</span>
                                    {ohlcvStatus.last_symbol && (
                                        <span className="font-semibold text-slate-100">{ohlcvStatus.last_symbol}</span>
                                    )}
                                </div>
                                <p className="font-mono whitespace-pre-wrap break-words">
                                    {ohlcvStatus.last_message}
                                </p>
                            </div>
                        )}
                    </div>
                    {(Object.keys(jobMeta) as Array<AdminJob["job_type"]>)
                        .filter((t) => t === "signal_process")
                        .map((type) => {
                            const meta = jobMeta[type];
                            const Icon = meta.icon;
                            const latest = latestJobs[type];
                            return (
                                <div key={type} className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Icon className={cn("h-5 w-5", meta.accent)} />
                                            <div>
                                                <h3 className="text-lg font-semibold">{meta.title}</h3>
                                                <p className="text-xs text-slate-500">{meta.description}</p>
                                            </div>
                                        </div>
                                        {signalStatus && (
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                                    signalStatus.status === "completed"
                                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                        : signalStatus.status === "running"
                                                        ? "bg-sky-500/15 text-sky-200 border border-sky-500/30"
                                                        : signalStatus.status === "failed"
                                                        ? "bg-rose-500/15 text-rose-200 border border-rose-500/30"
                                                        : "bg-slate-800 text-slate-300 border border-slate-700"
                                                )}
                                            >
                                                {signalStatus.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {signalStatus && (
                                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span>Total Symbols</span>
                                                    <span className="font-semibold">{signalStatus.total_symbols}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Processed</span>
                                                    <span className="font-semibold">{signalStatus.processed_symbols}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Progress</span>
                                                    <span className="font-semibold">{signalStatus.percent_complete.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-emerald-300">Signals written</span>
                                                    <span className="font-semibold text-emerald-300">{signalStatus.processed}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-yellow-300">Up to date</span>
                                                    <span className="font-semibold text-yellow-300">{signalStatus.uptodate}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-300">Skipped</span>
                                                    <span className="font-semibold">{signalStatus.skipped}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-rose-300">Errors</span>
                                                    <span className="font-semibold text-rose-300">{signalStatus.errors}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-end gap-2 mt-3">
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-500 px-4"
                                            onClick={() => handleTriggerJob(type)}
                                            disabled={jobAction !== null || signalStatus?.status === "running"}
                                        >
                                            {jobAction === type ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Run Signals
                                                </>
                                            )}
                                        </Button>
                                        {signalStatus?.job_id && signalStatus.status === "running" && (
                                            <Button
                                                variant="destructive"
                                                className="bg-rose-600 hover:bg-rose-500 px-4"
                                                onClick={() => handleStopJob(signalStatus.job_id!)}
                                                disabled={stoppingJobId === signalStatus.job_id}
                                            >
                                                {stoppingJobId === signalStatus.job_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "Stop"
                                                )}
                                            </Button>
                                        )}
                                        {latest && (
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="bg-slate-900 hover:bg-slate-800"
                                                onClick={() => handleViewLog(latest.id)}
                                            >
                                                <Terminal className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {signalStatus?.last_message && (
                                        <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="uppercase tracking-wide text-slate-500">Live status</span>
                                                {signalStatus.last_symbol && (
                                                    <span className="font-semibold text-slate-100">{signalStatus.last_symbol}</span>
                                                )}
                                            </div>
                                            <p className="font-mono whitespace-pre-wrap break-words">
                                                {signalStatus.last_message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </section>

                {jobMessage && (
                    <div
                        className={cn(
                            "rounded-xl border px-4 py-3 text-sm",
                            jobMessage.type === "success"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                        )}
                    >
                        {jobMessage.text}
                    </div>
                )}

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-sky-400" />
                                <h3 className="text-lg font-semibold">Accounts</h3>
                            </div>
                            <Button variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-xs" onClick={fetchUsers}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Sync
                            </Button>
                        </div>
                        {userMessage && (
                            <div
                                className={cn(
                                    "rounded-lg border px-3 py-2 text-sm",
                                    userMessage.type === "success"
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                        : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                                )}
                            >
                                {userMessage.text}
                            </div>
                        )}
                        <div className="overflow-auto rounded-xl border border-slate-800">
                            <table className="min-w-full text-sm divide-y divide-slate-800">
                                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">User</th>
                                        <th className="px-4 py-3 text-left">Role</th>
                                        <th className="px-4 py-3 text-left">Phone</th>
                                        <th className="px-4 py-3 text-left">State</th>
                                        <th className="px-4 py-3 text-left">Change Requests</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900">
                                    {users.map((user) => {
                                        const pending = changeRequests.filter((req) => req.user?.email === user.email);
                                        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-900/40">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-white">{user.full_name || "Unassigned"}</p>
                                                    <p className="text-xs text-slate-400">{user.email}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                                                            user.role === "admin" || user.role === "superadmin"
                                                                ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                                                : "bg-slate-800 text-slate-200 border border-slate-700"
                                                        )}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-300 text-xs">{user.phone_number || "—"}</td>
                                                <td className="px-4 py-3 text-slate-300 text-xs">{user.state || user.country || "—"}</td>
                                                <td className="px-4 py-3 text-slate-300 text-xs">{pending.length}</td>
                                                <td className="px-4 py-3 text-xs text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="bg-slate-900 hover:bg-slate-800"
                                                            onClick={() => handleNotifyUser(user)}
                                                            disabled={notifyingUserId === user.id}
                                                        >
                                                            {notifyingUserId === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Send className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                            disabled={isSuperAdmin || deletingUserId === user.id}
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            {deletingUserId === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                                    </div>
                                </div>
                    <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-emerald-300" />
                            <h3 className="text-lg font-semibold">Change Requests</h3>
                        </div>
                        <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                            {changeRequests.slice(0, 8).map((request) => (
                                <div key={request.id} className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-100">{request.user?.full_name || request.user?.email}</span>
                                        <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{request.request_type.replace("_", " ")}</p>
                                    <p className="text-sm text-slate-300">{request.details || "No additional details."}</p>
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                            request.status === "completed"
                                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                : "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30"
                                        )}
                                    >
                                        <Bell className="h-3 w-3" />
                                        {request.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-2">
                            <p className="font-semibold text-slate-200 uppercase tracking-wide">Telegram reminders</p>
                            <p>Manual notification buttons live in the account drawer. Auto alerts fire when users update their own details.</p>
                                </div>
                    </div>
                </section>

                <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            <h3 className="text-lg font-semibold">Job Monitor</h3>
                        </div>
                        <Button
                            variant="secondary"
                            className="bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-2"
                            onClick={fetchJobs}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                    <div className="overflow-auto rounded-xl border border-slate-800">
                        <table className="min-w-full text-sm divide-y divide-slate-800">
                            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Job</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left">Triggered</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Started</th>
                                    <th className="px-4 py-3 text-left">Finished</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                                {jobs.slice(0, 12).map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-950/60">
                                        <td className="px-4 py-3 text-slate-200 text-xs">
                                            <p className="font-semibold">{jobMeta[job.job_type].title}</p>
                                            <p className="text-[11px] text-slate-500">ID #{job.id}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-300">{job.job_type}</td>
                                        <td className="px-4 py-3 text-xs text-slate-300">
                                            {job.triggered_by === "auto" ? "Auto" : "Manual"}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                                    job.status === "completed"
                                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                        : job.status === "running"
                                                        ? "bg-sky-500/15 text-sky-200 border border-sky-500/30"
                                                        : job.status === "stopped"
                                                        ? "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30"
                                                        : "bg-rose-500/15 text-rose-200 border border-rose-500/30",
                                                )}
                                            >
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {job.started_at ? new Date(job.started_at).toLocaleString() : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {job.finished_at ? new Date(job.finished_at).toLocaleString() : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                {job.status === "running" && (
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="bg-rose-600 hover:bg-rose-500"
                                                        onClick={() => handleStopJob(job.id)}
                                                        disabled={stoppingJobId === job.id}
                                                    >
                                                        {stoppingJobId === job.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            "■"
                                                        )}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="bg-slate-900 hover:bg-slate-800"
                                                    onClick={() => handleViewLog(job.id)}
                                                >
                                                    <Terminal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-4 text-center text-xs text-slate-500"
                                        >
                                            No jobs have been run yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
                            </div>

            {showCreateDrawer && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-end z-50">
                    <div className="w-full max-w-lg bg-slate-900 h-full border-l border-slate-800 p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold">Create New User</h2>
                                <p className="text-xs text-slate-500">Manual onboarding with Telegram-ready profile info.</p>
                            </div>
                            <button className="text-slate-500 hover:text-white" onClick={() => setShowCreateDrawer(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {createMessage && (
                            <div
                                className={cn(
                                    "rounded-lg border px-3 py-2 text-sm mb-4",
                                    createMessage.type === "success"
                                        ? "border-emerald-500/30 text-emerald-200 bg-emerald-500/10"
                                        : "border-rose-500/30 text-rose-200 bg-rose-500/10"
                                )}
                            >
                                {createMessage.text}
                            </div>
                        )}
                        <form className="space-y-4" onSubmit={handleCreateUser}>
                            <div>
                                <label className="text-xs uppercase text-slate-500">Email</label>
                                <Input
                                    type="email"
                                    required
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                                    className="bg-slate-900/50 border-slate-800 mt-1"
                                    placeholder="user@rubikview.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500">Password</label>
                                <Input
                                    type="password"
                                    required
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                                    className="bg-slate-900/50 border-slate-800 mt-1"
                                    placeholder="Secure password"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-slate-500">Full Name</label>
                                    <Input
                                        value={createForm.full_name}
                                        onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-800 mt-1"
                                        placeholder="Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500">Role</label>
                                    <select
                                        className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 mt-1 text-sm"
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-slate-500">Phone</label>
                                    <Input
                                        value={createForm.phone_number}
                                        onChange={(e) => setCreateForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-800 mt-1"
                                        placeholder="+91 90000 00000"
                                    />
                                </div>
                                    <div>
                                    <label className="text-xs uppercase text-slate-500">State</label>
                                    <Input
                                        value={createForm.state}
                                        onChange={(e) => setCreateForm((prev) => ({ ...prev, state: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-800 mt-1"
                                        placeholder="Karnataka"
                                    />
                                    </div>
                                </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500">Country</label>
                                <Input
                                    value={createForm.country}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, country: e.target.value }))}
                                    className="bg-slate-900/50 border-slate-800 mt-1"
                                    placeholder="India"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-slate-500">City</label>
                                    <Input
                                        value={createForm.city}
                                       onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-800 mt-1"
                                        placeholder="Bengaluru"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500">Pin Code</label>
                                    <Input
                                        value={createForm.postal_code}
                                        onChange={(e) => setCreateForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-800 mt-1"
                                        placeholder="560001"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500">Telegram Chat ID</label>
                                <Input
                                    value={createForm.telegram_chat_id}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, telegram_chat_id: e.target.value }))}
                                    className="bg-slate-900/50 border-slate-800 mt-1"
                                    placeholder="@rubik_user or numeric ID"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-400 flex items-center justify-center gap-2" disabled={creatingUser}>
                                {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Create User
                            </Button>
                        </form>
                        </div>
                    </div>
            )}

            {logViewer.open && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Job Log #{logViewer.jobId}</h3>
                                <p className="text-xs text-slate-500">Raw console output streamed from the Python runner.</p>
                            </div>
                            <button className="text-slate-500 hover:text-white" onClick={() => setLogViewer({ open: false, loading: false, content: null })}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs font-mono text-slate-300">
                            {logViewer.loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : logViewer.error ? (
                                <p className="text-rose-300">{logViewer.error}</p>
                            ) : (
                                <pre className="whitespace-pre-wrap">{logViewer.content || "No log content."}</pre>
                            )}
                </div>
            </div>
                </div>
            )}
        </div>
    );
}
