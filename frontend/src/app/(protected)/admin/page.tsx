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
    Send,
    Trash2,
    MessageSquarePlus,
    Lightbulb,
    Bug,
    Cpu,
    Link2,
    Clock,
    Edit,
    Filter,
    Search,
    Eye,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RubikLoader } from "@/components/RubikLoader";
import SimpleSpinner from "@/components/SimpleSpinner";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

type UserRecord = {
    id: number;
    userid?: string;
    email: string;
    full_name?: string;
    role: string;
    phone_number?: string;
    state?: string;
    country?: string;
    city?: string;
    postal_code?: string;
    address_line1?: string;
    address_line2?: string;
    age?: number;
    is_active: boolean;
    last_activity?: string;
    created_at?: string;
    updated_at?: string;
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

type AdminTab = "processors" | "symbols" | "accounts" | "users_query" | "feedback" | "connections" | "logs";

const adminTabs: { key: AdminTab; label: string; description: string; icon: typeof Cpu }[] = [
    { key: "processors", label: "Processors", description: "OHCLV & Signals Management", icon: Cpu },
    { key: "symbols", label: "Symbols", description: "Stock symbols management", icon: Activity },
    { key: "connections", label: "Connections", description: "External integrations & APIs", icon: Link2 },
    { key: "logs", label: "Logs", description: "System, User & Job Logs", icon: Terminal },
    { key: "accounts", label: "Accounts", description: "User management", icon: Users },
    { key: "users_query", label: "Users Query", description: "Query and filter user details", icon: Search },
    { key: "feedback", label: "Feedback & Requests", description: "User feedback submissions", icon: MessageSquarePlus },
];

export default function AdminPage() {
    const router = useRouter();
    const [accessLoading, setAccessLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>("processors");
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [jobs, setJobs] = useState<AdminJob[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
    const [jobAction, setJobAction] = useState<string | null>(null);
    const [jobMessage, setJobMessage] = useState<MessageState>(null);
    const [stoppingJobId, setStoppingJobId] = useState<number | null>(null);
    const [forcingJobId, setForcingJobId] = useState<number | null>(null);
    const [showCreateDrawer, setShowCreateDrawer] = useState(false);
    const [createMessage, setCreateMessage] = useState<MessageState>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [userMessage, setUserMessage] = useState<MessageState>(null);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [notifyingUserId, setNotifyingUserId] = useState<number | null>(null);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        userid: "",
        password: "",
    });
    const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
    const [approvePassword, setApprovePassword] = useState("");
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedPendingUser, setSelectedPendingUser] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedUserDetails, setSelectedUserDetails] = useState<UserRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [accountFilters, setAccountFilters] = useState<Record<string, string>>({});

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

    type FeedbackItem = {
        id: number;
        user_id: number;
        feedback_type: string;
        title: string;
        description?: string;
        status: string;
        admin_notes?: string;
        created_at: string;
        user?: { email: string; full_name?: string };
    };
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [updatingFeedbackId, setUpdatingFeedbackId] = useState<number | null>(null);
    const [symbols, setSymbols] = useState<string[]>([]);
    const [symbolsLoading, setSymbolsLoading] = useState(true);

    // Removed job filter state – logs will be shown via the log panel
    const [jobsLoading, setJobsLoading] = useState(false);

    // Job Schedules
    type ScheduleItem = {
        id: number;
        job_type: string;
        schedule_type: string;
        schedule_value: string;
        is_active: boolean;
        next_run_at?: string | null;
        last_run_at?: string | null;
        created_at?: string;
        updated_at?: string;
    };
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
    const [scheduleForm, setScheduleForm] = useState({
        job_type: "ohlcv_load",
        schedule_type: "daily" as "daily" | "weekly" | "interval" | "once" | "date_range",
        hour: 9,
        minute: 0,
        day_of_week: 0,
        interval_hours: 6,
        interval_minutes: 30,
        start_date: "",
        start_time: "09:00",
        end_date: "",
        end_time: "17:00",
        is_active: true,
    });

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
    });

    // Logs tab state - moved to top level to fix hooks error
    const [activeLogTab, setActiveLogTab] = useState<"job_monitor" | "user_logs" | "system_logs">("job_monitor");
    const [showQueryModal, setShowQueryModal] = useState(false);
    const [queryForm, setQueryForm] = useState({
        columns: [] as string[],
        startDate: "",
        endDate: "",
    });
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

    const { isLoading: authLoading, isValid } = useAuth({ requireAuth: true, requireAdmin: true });

    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!isValid) {
            router.push("/dashboard");
        } else {
            setAccessLoading(false);
        }
    }, [authLoading, isValid, router]);

    const fetchUsers = async () => {
        try {
            const response = await api.get("/auth/users");
            // Ensure last_activity is properly parsed
            const usersWithActivity = response.data.map((user: any) => ({
                ...user,
                last_activity: user.last_activity ? new Date(user.last_activity).toISOString() : null
            }));
            setUsers(usersWithActivity);
        } catch (error) {
            console.error("Failed to load users", error);
        }
    };

    // State to force re-render for real-time activity updates
    const [activityUpdateTrigger, setActivityUpdateTrigger] = useState(0);

    // Real-time activity status updates
    useEffect(() => {
        if (activeTab !== "accounts" && activeTab !== "users_query") return;
        
        // Initial fetch
        fetchUsers();
        if (activeTab === "users_query") {
            fetchPendingUsers();
        }
        
        // Update more frequently for real-time activity status
        const interval = setInterval(() => {
            fetchUsers();
            if (activeTab === "users_query") {
                fetchPendingUsers();
            }
            // Force re-render to update activity status
            setActivityUpdateTrigger(prev => prev + 1);
        }, 10000); // Update every 10 seconds for real-time status

        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchJobs = async () => {
        setJobsLoading(true);
        try {
            // Fetch all jobs without filters
            const response = await api.get(`/admin/jobs`);
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to load jobs", error);
        } finally {
            setJobsLoading(false);
        }
    };

    // Removed filter change handler – not needed after filter UI removal

    // Removed reset filter handler

    const fetchSchedules = async () => {
        try {
            const response = await api.get("/admin/schedules?job_type=ohlcv_load");
            setSchedules(response.data);
        } catch (error) {
            console.error("Failed to load schedules", error);
        }
    };

    const handleCreateSchedule = async () => {
        try {
            let scheduleValue: any = {};

            if (scheduleForm.schedule_type === "daily") {
                // Validate daily schedule
                if (scheduleForm.hour < 0 || scheduleForm.hour > 23) {
                    alert("Hour must be between 0 and 23 for daily schedule");
                    return;
                }
                if (scheduleForm.minute < 0 || scheduleForm.minute > 59) {
                    alert("Minute must be between 0 and 59");
                    return;
                }
                scheduleValue = { hour: scheduleForm.hour, minute: scheduleForm.minute };
            } else if (scheduleForm.schedule_type === "weekly") {
                // Validate weekly schedule
                if (scheduleForm.hour < 0 || scheduleForm.hour > 23) {
                    alert("Hour must be between 0 and 23 for weekly schedule");
                    return;
                }
                if (scheduleForm.minute < 0 || scheduleForm.minute > 59) {
                    alert("Minute must be between 0 and 59");
                    return;
                }
                if (scheduleForm.day_of_week < 0 || scheduleForm.day_of_week > 6) {
                    alert("Invalid day of week selected");
                    return;
                }
                scheduleValue = { day_of_week: scheduleForm.day_of_week, hour: scheduleForm.hour, minute: scheduleForm.minute };
            } else if (scheduleForm.schedule_type === "interval") {
                if (scheduleForm.interval_hours > 0) {
                    if (scheduleForm.interval_hours < 1 || scheduleForm.interval_hours > 8760) {
                        alert("Hours must be between 1 and 8760 (1 year)");
                        return;
                    }
                    scheduleValue = { hours: scheduleForm.interval_hours };
                } else if (scheduleForm.interval_minutes > 0) {
                    if (scheduleForm.interval_minutes < 1 || scheduleForm.interval_minutes > 59) {
                        alert("Minutes must be between 1 and 59. Use hours for longer intervals.");
                        return;
                    }
                    scheduleValue = { minutes: scheduleForm.interval_minutes };
                } else {
                    alert("Please select an interval time (hours or minutes)");
                    return;
                }
            } else if (scheduleForm.schedule_type === "once") {
                scheduleValue = { start_date: scheduleForm.start_date, start_time: scheduleForm.start_time };
            } else if (scheduleForm.schedule_type === "date_range") {
                scheduleValue = {
                    start_date: scheduleForm.start_date,
                    start_time: scheduleForm.start_time,
                    end_date: scheduleForm.end_date,
                    end_time: scheduleForm.end_time,
                };
            }

            const payload = {
                job_type: scheduleForm.job_type,
                schedule_type: scheduleForm.schedule_type,
                schedule_value: scheduleValue,
                is_active: scheduleForm.is_active,
            };

            if (editingSchedule) {
                await api.put(`/admin/schedules/${editingSchedule.id}`, payload);
            } else {
                await api.post("/admin/schedules", payload);
            }

            fetchSchedules();
            handleCancelSchedule();
        } catch (error) {
            console.error("Failed to save schedule", error);
        }
    };

    const handleDeleteSchedule = async (scheduleId: number) => {
        if (!confirm("Are you sure you want to delete this schedule?")) return;
        try {
            await api.delete(`/admin/schedules/${scheduleId}`);
            fetchSchedules();
        } catch (error) {
            console.error("Failed to delete schedule", error);
        }
    };

    const handleCancelSchedule = () => {
        setShowScheduleModal(false);
        setEditingSchedule(null);
        setScheduleForm({
            job_type: "ohlcv_load",
            schedule_type: "daily",
            hour: 9,
            minute: 0,
            day_of_week: 0,
            interval_hours: 6,
            interval_minutes: 30,
            start_date: "",
            start_time: "09:00",
            end_date: "",
            end_time: "17:00",
            is_active: true,
        });
    };

    const handleEditSchedule = (schedule: ScheduleItem) => {
        const value = JSON.parse(schedule.schedule_value);
        setEditingSchedule(schedule);
        setScheduleForm({
            job_type: schedule.job_type,
            schedule_type: schedule.schedule_type as any,
            hour: value.hour || 9,
            minute: value.minute || 0,
            day_of_week: value.day_of_week || 0,
            interval_hours: value.hours || 6,
            interval_minutes: value.minutes || 30,
            start_date: value.start_date || "",
            start_time: value.start_time || "09:00",
            end_date: value.end_date || "",
            end_time: value.end_time || "17:00",
            is_active: schedule.is_active,
        });
        setShowScheduleModal(true);
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

    const fetchPendingUsers = async () => {
        try {
            const response = await api.get("/admin/pending-users?status=pending");
            setPendingUsers(response.data);
        } catch (error) {
            console.error("Failed to load pending users", error);
        }
    };

    const handleApprovePendingUser = async (requestId: number) => {
        if (!approvePassword) {
            setUserMessage({ type: "error", text: "Please enter a password for the new user." });
            return;
        }
        setApprovingUserId(requestId);
        setUserMessage(null);
        try {
            await api.post(`/admin/pending-users/${requestId}/approve`, { password: approvePassword });
            setShowApproveModal(false);
            setApprovePassword("");
            setSelectedPendingUser(null);
            fetchPendingUsers();
            fetchUsers();
            setUserMessage({ type: "success", text: "User account created and enabled successfully." });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Failed to approve user request.",
            });
        } finally {
            setApprovingUserId(null);
        }
    };

    const handleRejectPendingUser = async (requestId: number) => {
        setUserMessage(null);
        try {
            await api.post(`/admin/pending-users/${requestId}/reject`);
            fetchPendingUsers();
            setUserMessage({ type: "success", text: "User request rejected." });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Failed to reject user request.",
            });
        }
    };

    const fetchFeedback = async () => {
        try {
            const response = await api.get("/auth/feedback/all");
            setFeedbackList(response.data);
        } catch (error) {
            console.error("Failed to load feedback", error);
        }
    };

    const fetchSymbols = async () => {
        setSymbolsLoading(true);
        try {
            const response = await api.get("/stocks/");
            setSymbols(response.data);
        } catch (error) {
            console.error("Failed to load symbols", error);
        } finally {
            setSymbolsLoading(false);
        }
    };

    const handleUpdateFeedbackStatus = async (feedbackId: number, newStatus: string) => {
        setUpdatingFeedbackId(feedbackId);
        try {
            await api.put(`/auth/feedback/${feedbackId}`, { status: newStatus });
            fetchFeedback();
        } catch (error) {
            console.error("Failed to update feedback", error);
        } finally {
            setUpdatingFeedbackId(null);
        }
    };

    useEffect(() => {
        if (accessLoading) return;
        fetchUsers();
        fetchJobs();
        fetchOhlcvStatus();
        fetchSignalStatus();
        fetchChangeRequests();
        fetchFeedback();
        fetchSchedules();
        fetchSymbols();
        fetchPendingUsers();
        const interval = setInterval(() => {
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
            fetchSchedules();
        }, 2000);
        return () => clearInterval(interval);
    }, [accessLoading]);



    // Handle Escape key for schedule modal
    useEffect(() => {
        if (!showScheduleModal) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleCancelSchedule();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showScheduleModal]);

    const latestJobs = useMemo(() => {
        const map: Record<string, AdminJob | undefined> = {};
        jobs.forEach((job) => {
            if (!map[job.job_type]) {
                map[job.job_type] = job;
            }
        });
        return map;
    }, [jobs]);

    // Filter jobs based on column filters - must be after all useState and useEffect hooks
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            for (const [key, value] of Object.entries(columnFilters)) {
                if (!value) continue;
                const jobValue = String((job as any)[key] || "").toLowerCase();
                if (!jobValue.includes(value.toLowerCase())) return false;
            }
            return true;
        });
    }, [jobs, columnFilters]);

    const handleTriggerJob = async (type: AdminJob["job_type"]) => {
        setJobAction(type);
        try {
            await api.post(`/admin/jobs/${type}`);
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        } catch (error: unknown) {
            // Error will be reflected in status on the card
            console.error("Failed to start job:", error);
        } finally {
            setJobAction(null);
        }
    };

    const handleStopJob = async (jobId: number) => {
        setStoppingJobId(jobId);
        try {
            await api.post(`/admin/jobs/${jobId}/stop`);
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        } catch (error: unknown) {
            // Error will be reflected in status on the card
            console.error("Failed to stop job:", error);
        } finally {
            setStoppingJobId(null);
        }
    };

    const handleForceStopJob = async (jobId: number) => {
        setForcingJobId(jobId);
        try {
            await api.post(`/admin/jobs/${jobId}/force-stop`);
            fetchJobs();
            fetchOhlcvStatus();
            fetchSignalStatus();
        } catch (error: unknown) {
            // Error will be reflected in status on the card
            console.error("Failed to force stop job:", error);
        } finally {
            setForcingJobId(null);
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

    const handleEditUser = (user: UserRecord) => {
        setEditingUserId(user.id);
        setEditForm({
            userid: user.userid || "",
            password: "",
        });
    };

    const handleSaveUserEdit = async (userId: number) => {
        setUserMessage(null);
        try {
            // Validate userid format (alphanumeric, underscore, hyphen only - no @)
            if (editForm.userid && !/^[a-zA-Z0-9_-]+$/.test(editForm.userid)) {
                setUserMessage({
                    type: "error",
                    text: "UserID must be alphanumeric (letters, numbers, underscore, or hyphen only). No @ symbol allowed.",
                });
                return;
            }
            
            const payload: any = {};
            if (editForm.userid) payload.userid = editForm.userid;
            if (editForm.password) payload.password = editForm.password;
            
            await api.put(`/auth/users/${userId}`, payload);
            setEditingUserId(null);
            setEditForm({ userid: "", password: "" });
            fetchUsers();
            setUserMessage({ type: "success", text: "User updated successfully." });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Failed to update user.",
            });
        }
    };

    const handleToggleUserActive = async (userId: number, currentStatus: boolean) => {
        setTogglingUserId(userId);
        setUserMessage(null);
        try {
            await api.put(`/auth/users/${userId}`, { is_active: !currentStatus });
            fetchUsers();
            setUserMessage({ type: "success", text: `User ${!currentStatus ? "enabled" : "disabled"} successfully.` });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            setUserMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Failed to update user status.",
            });
        } finally {
            setTogglingUserId(null);
        }
    };

    const isUserActiveNow = (user: UserRecord): boolean => {
        if (!user.last_activity) return false;
        try {
            const lastActivity = new Date(user.last_activity);
            const now = new Date();
            // Check if date is valid
            if (isNaN(lastActivity.getTime())) return false;
            const diffSeconds = (now.getTime() - lastActivity.getTime()) / 1000;
            // Active if last activity within 2 minutes (120 seconds) and not in the future
            return diffSeconds <= 120 && diffSeconds >= 0;
        } catch (error) {
            console.error("Error checking user activity:", error, user);
            return false;
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

    const handleColumnFilterChange = (column: string, value: string) => {
        setColumnFilters(prev => ({ ...prev, [column]: value }));
    };

    if (accessLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <RubikLoader label="Rubik is opening admin console…" />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Processors Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderProcessorsTab = () => (
        <div className="space-y-6">
            {/* OHCLV and Signal Cards */}
            <section className="grid gap-6 lg:grid-cols-2">
                {/* OHCLV Card */}
                <div className="glass-panel rounded-xl border border-slate-800 p-4 space-y-3">
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
                                            : ohlcvStatus.status === "stopped"
                                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
                    <div className="flex items-center justify-between gap-2 mt-3">
                        <Button
                            variant="secondary"
                            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-3 text-xs"
                            onClick={() => {
                                setEditingSchedule(null);
                                setScheduleForm({
                                    job_type: "ohlcv_load",
                                    schedule_type: "daily",
                                    hour: 9,
                                    minute: 0,
                                    day_of_week: 0,
                                    interval_hours: 6,
                                    interval_minutes: 30,
                                    start_date: "",
                                    start_time: "09:00",
                                    end_date: "",
                                    end_time: "17:00",
                                    is_active: true,
                                });
                                setShowScheduleModal(true);
                            }}
                        >
                            <Clock className="h-3 w-3 mr-1" />
                            Schedule
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 px-4"
                                onClick={() => handleTriggerJob("ohlcv_load")}
                                disabled={jobAction !== null || ohlcvStatus?.status === "running"}
                            >
                                {jobAction === "ohlcv_load" ? (
                                    <SimpleSpinner size={16} />
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
                                    disabled={stoppingJobId === ohlcvStatus.job_id || forcingJobId === ohlcvStatus.job_id}
                                >
                                    {stoppingJobId === ohlcvStatus.job_id ? <SimpleSpinner size={16} /> : "Stop"}
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
                    </div>
                    {schedules.filter(s => s.job_type === "ohlcv_load").length > 0 && (
                        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-3 w-3 text-amber-400" />
                                <span className="font-semibold text-amber-300">Scheduled Times:</span>
                            </div>
                            {schedules
                                .filter(s => s.job_type === "ohlcv_load")
                                .map((schedule) => {
                                    const value = JSON.parse(schedule.schedule_value);
                                    let scheduleText = "";
                                    if (schedule.schedule_type === "daily") {
                                        scheduleText = `Daily at ${String(value.hour || 9).padStart(2, "0")}:${String(value.minute || 0).padStart(2, "0")}`;
                                    } else if (schedule.schedule_type === "weekly") {
                                        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                                        scheduleText = `Every ${days[value.day_of_week || 0]} at ${String(value.hour || 9).padStart(2, "0")}:${String(value.minute || 0).padStart(2, "0")}`;
                                    } else if (schedule.schedule_type === "interval") {
                                        if (value.hours) {
                                            scheduleText = `Every ${value.hours} hour(s)`;
                                        } else if (value.minutes) {
                                            scheduleText = `Every ${value.minutes} minute(s)`;
                                        }
                                    } else if (schedule.schedule_type === "once") {
                                        const runDate = value.start_date ? new Date(value.start_date + "T" + (value.start_time || "09:00")) : null;
                                        scheduleText = runDate ? `Once on ${runDate.toLocaleDateString()} at ${runDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "One-time schedule";
                                    } else if (schedule.schedule_type === "date_range") {
                                        const startDate = value.start_date ? new Date(value.start_date + "T" + (value.start_time || "09:00")) : null;
                                        const endDate = value.end_date ? new Date(value.end_date + "T" + (value.end_time || "17:00")) : null;
                                        if (startDate && endDate) {
                                            scheduleText = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                        }
                                    }
                                    return (
                                        <div key={schedule.id} className="flex items-center justify-between p-2 rounded-md bg-slate-900/30 border border-slate-800/50 gap-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full flex-shrink-0",
                                                    schedule.is_active ? "bg-emerald-400" : "bg-slate-500"
                                                )}></span>
                                                <span className={schedule.is_active ? "text-amber-200/90" : "text-slate-500"}>
                                                    {scheduleText}
                                                </span>
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                                                    schedule.is_active
                                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                        : "bg-slate-700/50 text-slate-500 border border-slate-700"
                                                )}>
                                                    {schedule.is_active ? "ACTIVE" : "INACTIVE"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {schedule.next_run_at && schedule.is_active && (
                                                    <span className="text-amber-300/60 text-[10px] whitespace-nowrap">
                                                        Next: {new Date(schedule.next_run_at).toLocaleString()}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleEditSchedule(schedule)}
                                                    className="px-2 py-1 text-xs bg-slate-800/50 hover:bg-amber-600/20 text-slate-400 hover:text-amber-300 rounded transition-colors border border-slate-700 hover:border-amber-500/30"
                                                    title="Edit Schedule"
                                                >
                                                    <Edit className="h-3 w-3 inline mr-1" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                                    className="px-2 py-1 text-xs bg-slate-800/50 hover:bg-rose-600/20 text-slate-400 hover:text-rose-300 rounded transition-colors border border-slate-700 hover:border-rose-500/30"
                                                    title="Cancel/Delete Schedule"
                                                >
                                                    <Trash2 className="h-3 w-3 inline mr-1" />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                    {ohlcvStatus && ohlcvStatus.status === "running" && (
                        <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                            <div className="flex items-center justify-between mb-1">
                                <span className="uppercase tracking-wide text-slate-500">Live status</span>
                                {ohlcvStatus.last_symbol && (
                                    <span className="font-semibold text-slate-100">{ohlcvStatus.last_symbol}</span>
                                )}
                            </div>
                            <p className="font-mono whitespace-pre-wrap break-words max-h-20 overflow-auto">
                                {ohlcvStatus.last_message || "Starting..."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Signal Processing Card */}
                <div className="glass-panel rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-emerald-300" />
                            <div>
                                <h3 className="text-lg font-semibold">Process Signal Data</h3>
                                <p className="text-xs text-slate-500">Calculate indicator signals and score rankings.</p>
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
                                            : signalStatus.status === "stopped"
                                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
                            onClick={() => handleTriggerJob("signal_process")}
                            disabled={jobAction !== null || signalStatus?.status === "running"}
                        >
                            {jobAction === "signal_process" ? (
                                <SimpleSpinner size={16} />
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
                                disabled={stoppingJobId === signalStatus.job_id || forcingJobId === signalStatus.job_id}
                            >
                                {stoppingJobId === signalStatus.job_id ? <SimpleSpinner size={16} /> : "Stop"}
                            </Button>
                        )}
                        {latestJobs.signal_process && (
                            <Button
                                variant="secondary"
                                size="icon"
                                className="bg-slate-900 hover:bg-slate-800"
                                onClick={() => handleViewLog(latestJobs.signal_process!.id)}
                            >
                                <Terminal className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {signalStatus && signalStatus.status === "running" && (
                        <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                            <div className="flex items-center justify-between mb-1">
                                <span className="uppercase tracking-wide text-slate-500">Live status</span>
                                {signalStatus.last_symbol && (
                                    <span className="font-semibold text-slate-100">{signalStatus.last_symbol}</span>
                                )}
                            </div>
                            <p className="font-mono whitespace-pre-wrap break-words max-h-20 overflow-auto">
                                {signalStatus.last_message || "Starting..."}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Job Message */}
            {/* Job Message - Removed as status is shown on cards */}

        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Accounts Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderAccountsTab = () => {
        // Filter users based on search query
        const filteredUsers = users.filter((user) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                (user.full_name?.toLowerCase().includes(query)) ||
                (user.email?.toLowerCase().includes(query)) ||
                (user.userid?.toLowerCase().includes(query)) ||
                (user.phone_number?.toLowerCase().includes(query))
            );
        });

        return (
        <div className="space-y-6">
            <section>
                {/* Users Table */}
                <div className="glass-panel rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-sky-400" />
                            <h3 className="text-lg font-semibold">Accounts</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by name, email, userid, phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 bg-slate-900/50 border-slate-800 text-xs h-8 w-64"
                                />
                            </div>
                            <Button className="bg-sky-500 hover:bg-sky-400 text-xs flex items-center gap-2" onClick={() => setShowCreateDrawer(true)}>
                                <Plus className="h-4 w-4" />
                                Create User
                            </Button>
                            <Button variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-xs" onClick={fetchUsers}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Sync
                            </Button>
                        </div>
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
                                    <th className="px-4 py-3 text-left">UserID</th>
                                    <th className="px-4 py-3 text-left">Password</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Activity</th>
                                    <th className="px-4 py-3 text-left">Full Details</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                                {filteredUsers.map((user) => {
                                    const pending = changeRequests.filter((req) => req.user?.email === user.email);
                                    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                                    // Recalculate activity status on each render for real-time updates
                                    const isActive = isUserActiveNow(user);
                                    const isEditing = editingUserId === user.id;
                                    // Use activityUpdateTrigger to force re-calculation
                                    void activityUpdateTrigger;
                                    
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-900/40">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-white">{user.full_name || "Unassigned"}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <Input
                                                        value={editForm.userid}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            // Only allow alphanumeric, underscore, hyphen (no @)
                                                            if (/^[a-zA-Z0-9_-]*$/.test(value)) {
                                                                setEditForm(prev => ({ ...prev, userid: value }));
                                                            }
                                                        }}
                                                        className="bg-slate-900/60 border-slate-800 text-xs h-7 w-24"
                                                        placeholder="UserID (alphanumeric)"
                                                        title="Alphanumeric only (no @ symbol)"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300 text-xs font-mono">{user.userid || "—"}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <Input
                                                        type="password"
                                                        value={editForm.password}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                                        className="bg-slate-900/60 border-slate-800 text-xs h-7 w-32"
                                                        placeholder="New password"
                                                    />
                                                ) : (
                                                    <span className="text-slate-400 text-xs font-mono">••••••••</span>
                                                )}
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
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleToggleUserActive(user.id, user.is_active)}
                                                    disabled={togglingUserId === user.id}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
                                                        user.is_active ? "bg-emerald-500" : "bg-slate-700",
                                                        (isSuperAdmin || togglingUserId === user.id) && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    {togglingUserId === user.id ? (
                                                        <SimpleSpinner size={10} />
                                                    ) : (
                                                        <span
                                                            className={cn(
                                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                                user.is_active ? "translate-x-6" : "translate-x-1"
                                                            )}
                                                        />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        isActive ? "text-emerald-300" : "text-slate-400"
                                                    )}>
                                                        {isActive ? "Live" : "Not Live"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-300">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300"
                                                    onClick={() => {
                                                        setSelectedUserDetails(user);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    title="View Full Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                                                                onClick={() => handleSaveUserEdit(user.id)}
                                                            >
                                                                <X className="h-4 w-4 rotate-45" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-slate-200"
                                                                onClick={() => {
                                                                    setEditingUserId(null);
                                                                    setEditForm({ userid: "", password: "" });
                                                                }}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="bg-slate-900 hover:bg-slate-800"
                                                                onClick={() => handleEditUser(user)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="bg-slate-900 hover:bg-slate-800"
                                                                onClick={() => handleNotifyUser(user)}
                                                                disabled={notifyingUserId === user.id}
                                                            >
                                                                {notifyingUserId === user.id ? <SimpleSpinner size={16} /> : <Send className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                                disabled={isSuperAdmin || deletingUserId === user.id}
                                                                onClick={() => handleDeleteUser(user.id)}
                                                            >
                                                                {deletingUserId === user.id ? <SimpleSpinner size={16} /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Users Query Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderUsersQueryTab = () => {
        const [queryFilters, setQueryFilters] = useState<Record<string, string>>({});
        const [queryResults, setQueryResults] = useState<any[]>([]);
        const [isLoadingQuery, setIsLoadingQuery] = useState(false);

        const buildAllData = () => {
            return [
                ...users.map(u => ({ ...u, type: 'user', request_status: null })),
                ...pendingUsers.map(p => ({
                    id: p.id,
                    userid: p.userid,
                    email: p.email || '',
                    full_name: p.full_name,
                    phone_number: p.phone_number,
                    age: p.age,
                    address_line1: p.address_line1,
                    address_line2: p.address_line2,
                    city: p.city,
                    state: p.state,
                    postal_code: p.postal_code,
                    country: p.country,
                    role: 'pending',
                    is_active: false,
                    last_activity: null,
                    created_at: p.created_at,
                    type: 'pending_request',
                    request_status: p.status,
                    message: p.message
                }))
            ];
        };

        const handleQuery = () => {
            setIsLoadingQuery(true);
            const allData = buildAllData();
            
            let filtered = allData;
            
            if (queryFilters.name) {
                filtered = filtered.filter(u => u.full_name?.toLowerCase().includes(queryFilters.name.toLowerCase()));
            }
            if (queryFilters.email) {
                filtered = filtered.filter(u => u.email?.toLowerCase().includes(queryFilters.email.toLowerCase()));
            }
            if (queryFilters.userid) {
                filtered = filtered.filter(u => u.userid?.toLowerCase().includes(queryFilters.userid.toLowerCase()));
            }
            if (queryFilters.phone) {
                filtered = filtered.filter(u => u.phone_number?.toLowerCase().includes(queryFilters.phone.toLowerCase()));
            }
            if (queryFilters.role) {
                if (queryFilters.role === 'pending') {
                    filtered = filtered.filter(u => u.type === 'pending_request');
                } else {
                    filtered = filtered.filter(u => u.role === queryFilters.role && u.type === 'user');
                }
            }
            if (queryFilters.status) {
                if (queryFilters.status === 'pending') {
                    filtered = filtered.filter(u => u.type === 'pending_request' && u.request_status === 'pending');
                } else {
                    filtered = filtered.filter(u => 
                        u.type === 'user' && (queryFilters.status === "active" ? u.is_active : !u.is_active)
                    );
                }
            }
            
            setQueryResults(filtered);
            setIsLoadingQuery(false);
        };

        // Load pending users when tab is active and auto-query
        useEffect(() => {
            if (activeTab === "users_query") {
                fetchPendingUsers();
                fetchUsers();
            }
        }, [activeTab]);

        // Auto-query when data is loaded
        useEffect(() => {
            if (activeTab === "users_query" && (users.length > 0 || pendingUsers.length > 0)) {
                const allData = buildAllData();
                setQueryResults(allData);
            }
        }, [users, pendingUsers, activeTab]);

        return (
            <div className="space-y-6">
                <div className="glass-panel rounded-xl border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Search className="h-5 w-5 text-sky-400" />
                        <h3 className="text-lg font-semibold">Query Users & Pending Requests</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Name</label>
                            <Input
                                value={queryFilters.name || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-slate-900/50 border-slate-800 text-xs"
                                placeholder="Filter by name"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Email</label>
                            <Input
                                value={queryFilters.email || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, email: e.target.value }))}
                                className="bg-slate-900/50 border-slate-800 text-xs"
                                placeholder="Filter by email"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">UserID</label>
                            <Input
                                value={queryFilters.userid || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, userid: e.target.value }))}
                                className="bg-slate-900/50 border-slate-800 text-xs"
                                placeholder="Filter by UserID"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Phone</label>
                            <Input
                                value={queryFilters.phone || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, phone: e.target.value }))}
                                className="bg-slate-900/50 border-slate-800 text-xs"
                                placeholder="Filter by phone"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Role</label>
                            <select
                                value={queryFilters.role || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 text-xs"
                            >
                                <option value="">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                                <option value="pending">Pending Requests</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 mb-1 block">Status</label>
                            <select
                                value={queryFilters.status || ""}
                                onChange={(e) => setQueryFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 text-xs"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button onClick={handleQuery} className="bg-sky-500 hover:bg-sky-400" disabled={isLoadingQuery}>
                            {isLoadingQuery ? (
                                <>
                                    <SimpleSpinner size={16} className="mr-2" />
                                    Querying...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Query
                                </>
                            )}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                setQueryFilters({});
                                const allData = buildAllData();
                                setQueryResults(allData);
                            }}
                        >
                            Show All
                        </Button>
                    </div>
                </div>

                {queryResults.length > 0 ? (
                    <div className="glass-panel rounded-xl border border-slate-800 p-4">
                        <h4 className="text-sm font-semibold mb-4">Query Results ({queryResults.length})</h4>
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm divide-y divide-slate-800">
                                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Name</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                        <th className="px-4 py-3 text-left">UserID</th>
                                        <th className="px-4 py-3 text-left">Phone</th>
                                        <th className="px-4 py-3 text-left">Age</th>
                                        <th className="px-4 py-3 text-left">Role/Status</th>
                                        <th className="px-4 py-3 text-left">Account Status</th>
                                        <th className="px-4 py-3 text-left">Activity</th>
                                        <th className="px-4 py-3 text-left">Last Activity</th>
                                        <th className="px-4 py-3 text-left">Requested At</th>
                                        <th className="px-4 py-3 text-left">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900">
                                    {queryResults.map((item) => {
                                        // Recalculate activity status on each render for real-time updates
                                        const isActive = item.type === 'user' ? isUserActiveNow(item) : false;
                                        const isPendingRequest = item.type === 'pending_request';
                                        // Use activityUpdateTrigger to force re-calculation
                                        void activityUpdateTrigger;
                                        return (
                                            <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-900/40">
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                                                        isPendingRequest 
                                                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                                            : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                                    )}>
                                                        {isPendingRequest ? "Pending" : "User"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">{item.full_name || "—"}</td>
                                                <td className="px-4 py-3 text-xs">{item.email || "—"}</td>
                                                <td className="px-4 py-3 text-xs font-mono">{item.userid || "—"}</td>
                                                <td className="px-4 py-3 text-xs">{item.phone_number || "—"}</td>
                                                <td className="px-4 py-3 text-xs">{item.age || "—"}</td>
                                                <td className="px-4 py-3">
                                                    {isPendingRequest ? (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs",
                                                            item.request_status === 'pending' 
                                                                ? "bg-amber-500/15 text-amber-300" 
                                                                : item.request_status === 'approved'
                                                                ? "bg-emerald-500/15 text-emerald-300"
                                                                : "bg-rose-500/15 text-rose-300"
                                                        )}>
                                                            {item.request_status || 'pending'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-200">
                                                            {item.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isPendingRequest ? (
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">
                                                            Not Created
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs",
                                                            item.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"
                                                        )}>
                                                            {item.is_active ? "Enabled" : "Disabled"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isPendingRequest ? (
                                                        <span className="text-xs text-slate-500">N/A</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full animate-pulse",
                                                                isActive ? "bg-emerald-400" : "bg-slate-600"
                                                            )} />
                                                            <span className={cn(
                                                                "text-xs font-semibold",
                                                                isActive ? "text-emerald-300" : "text-slate-400"
                                                            )}>
                                                                {isActive ? "Live" : "Not Live"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400">
                                                    {item.last_activity ? new Date(item.last_activity).toLocaleString() : "Never"}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400">
                                                    {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                                                    {item.message || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel rounded-xl border border-slate-800 p-8 text-center">
                        <p className="text-slate-400 text-sm">No results found. Try adjusting your filters or click "Show All" to see all users and pending requests.</p>
                    </div>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Logs Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderLogsTab = () => {
        const renderColumnHeader = (label: string, key: string) => (
            <th className="px-4 py-2 border-b border-slate-800 relative group">
                <div className="flex items-center justify-between gap-1">
                    <span>{label}</span>
                    <div className="relative">
                        <button
                            onClick={() => setActiveFilterColumn(activeFilterColumn === key ? null : key)}
                            className={cn(
                                "p-1 rounded hover:bg-slate-800 transition-colors",
                                columnFilters[key] ? "text-sky-400" : "text-slate-600 opacity-0 group-hover:opacity-100"
                            )}
                        >
                            <Filter className="h-3 w-3" />
                        </button>
                        {activeFilterColumn === key && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 p-2">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                                    <Search className="h-3 w-3 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-300">Filter {label}</span>
                                </div>
                                <Input
                                    autoFocus
                                    value={columnFilters[key] || ""}
                                    onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                                    placeholder={`Search ${label}...`}
                                    className="h-7 text-xs bg-slate-950 border-slate-800"
                                />
                                <div className="mt-2 flex justify-end">
                                    <button
                                        onClick={() => setActiveFilterColumn(null)}
                                        className="text-[10px] text-sky-400 hover:text-sky-300"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </th>
        );

        return (
            <div className="flex flex-col h-[calc(100vh-200px)] gap-4">
                {/* Top Navigation for Logs */}
                <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-slate-800 w-fit">
                    <button
                        onClick={() => setActiveLogTab("job_monitor")}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            activeLogTab === "job_monitor"
                                ? "bg-slate-800 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        )}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Job Monitor
                    </button>
                    <button
                        onClick={() => setActiveLogTab("user_logs")}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            activeLogTab === "user_logs"
                                ? "bg-slate-800 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        )}
                    >
                        <Users className="h-3.5 w-3.5" />
                        User Logs
                    </button>
                    <button
                        onClick={() => setActiveLogTab("system_logs")}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            activeLogTab === "system_logs"
                                ? "bg-slate-800 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        )}
                    >
                        <Database className="h-3.5 w-3.5" />
                        System Logs
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 glass-panel rounded-xl border border-slate-800 p-4 flex flex-col min-w-0">
                    {activeLogTab === "job_monitor" && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-200">Job Execution Logs</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 gap-2"
                                        onClick={() => setShowQueryModal(true)}
                                    >
                                        <Search className="h-3 w-3" />
                                        Query
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={fetchJobs}
                                        disabled={jobsLoading}
                                        className="h-7 w-7 border-slate-700 hover:bg-slate-800 text-slate-300"
                                    >
                                        <RefreshCw className={cn("h-3 w-3", jobsLoading && "animate-spin")} />
                                    </Button>
                                </div>
                            </div>

                            {/* Compact Job Table */}
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-800/70 bg-slate-950/40">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900/50 text-[11px] uppercase text-slate-400 font-medium sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            {renderColumnHeader("Job ID", "id")}
                                            {renderColumnHeader("Type", "job_type")}
                                            {renderColumnHeader("Trigger", "triggered_by")}
                                            {renderColumnHeader("Status", "status")}
                                            {renderColumnHeader("Started", "started_at")}
                                            {renderColumnHeader("Finished", "finished_at")}
                                            <th className="px-4 py-2 border-b border-slate-800 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900">
                                        {filteredJobs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                                                    {jobsLoading ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <SimpleSpinner size={16} />
                                                            <span className="text-[10px]">Loading jobs...</span>
                                                        </div>
                                                    ) : (
                                                        "No jobs found."
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredJobs.map((job) => (
                                                <tr key={job.id} className="hover:bg-slate-900/40 transition-colors group">
                                                    <td className="px-4 py-2 text-slate-300 text-[11px] font-mono">
                                                        #{job.id}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-300">
                                                        <div className="flex items-center gap-1.5">
                                                            {job.job_type === "ohlcv_load" ? (
                                                                <Database className="h-3 w-3 text-sky-400" />
                                                            ) : (
                                                                <Activity className="h-3 w-3 text-emerald-400" />
                                                            )}
                                                            <span>{jobMeta[job.job_type]?.title || job.job_type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-400">
                                                        {job.triggered_by === "auto" ? "Auto" : "Manual"}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px]">
                                                        <span
                                                            className={cn(
                                                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                                job.status === "completed"
                                                                    ? "text-emerald-400 bg-emerald-500/10"
                                                                    : job.status === "running"
                                                                        ? "text-sky-400 bg-sky-500/10 animate-pulse"
                                                                        : job.status === "stopped"
                                                                            ? "text-yellow-400 bg-yellow-500/10"
                                                                            : "text-rose-400 bg-rose-500/10"
                                                            )}
                                                        >
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-500 font-mono">
                                                        {job.started_at ? new Date(job.started_at).toLocaleString() : "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-500 font-mono">
                                                        {job.finished_at ? new Date(job.finished_at).toLocaleString() : "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {job.status === "running" && (
                                                                <>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-6 w-6 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                                                                        onClick={() => handleStopJob(job.id)}
                                                                        disabled={stoppingJobId === job.id || forcingJobId === job.id}
                                                                        title="Stop Job"
                                                                    >
                                                                        {stoppingJobId === job.id ? <SimpleSpinner size={10} /> : <span className="text-[10px]">■</span>}
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-6 w-6 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                                                        onClick={() => handleForceStopJob(job.id)}
                                                                        disabled={forcingJobId === job.id}
                                                                        title="Force Stop"
                                                                    >
                                                                        {forcingJobId === job.id ? <SimpleSpinner size={10} /> : <span className="font-bold text-[10px]">!</span>}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="h-6 w-6 bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                                onClick={() => handleViewLog(job.id)}
                                                                title="View Logs"
                                                            >
                                                                <Terminal className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {activeLogTab === "user_logs" && (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                            User logs module coming soon.
                        </div>
                    )}
                    {activeLogTab === "system_logs" && (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                            System logs module coming soon.
                        </div>
                    )}
                </div>

                {/* Query Modal */}
                {showQueryModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-200">Query Logs</h3>
                                <button className="text-slate-500 hover:text-white" onClick={() => setShowQueryModal(false)}>
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-2 block">Date Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="date"
                                            className="bg-slate-900/50 border-slate-800 text-xs"
                                            value={queryForm.startDate}
                                            onChange={e => setQueryForm({ ...queryForm, startDate: e.target.value })}
                                        />
                                        <Input
                                            type="date"
                                            className="bg-slate-900/50 border-slate-800 text-xs"
                                            value={queryForm.endDate}
                                            onChange={e => setQueryForm({ ...queryForm, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-2 block">Columns to Fetch</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["Job ID", "Type", "Status", "Trigger", "Started At", "Finished At", "Duration", "Error Details"].map(col => (
                                            <label key={col} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                                                <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20" />
                                                {col}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setShowQueryModal(false)} className="text-slate-400 hover:text-white">Cancel</Button>
                                    <Button className="bg-sky-600 hover:bg-sky-500 text-white" onClick={() => {
                                        alert("Query executed! (Backend integration pending)");
                                        setShowQueryModal(false);
                                    }}>
                                        Run Query
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Connections Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderConnectionsTab = () => (
        <div className="space-y-6">
            <section className="glass-panel rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-semibold">External Connections</h3>
                    </div>
                </div>
                <p className="text-slate-500 text-sm">Configure external integrations, APIs, and data sources.</p>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Placeholder cards for future connections */}
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-sky-400" />
                            <span className="font-semibold text-white">Database</span>
                        </div>
                        <p className="text-xs text-slate-500">DuckDB connection for OHCLV and signals data.</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Connected
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-blue-400" />
                            <span className="font-semibold text-white">Telegram Bot</span>
                        </div>
                        <p className="text-xs text-slate-500">Notifications and alerts via Telegram.</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            Not Configured
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-400" />
                            <span className="font-semibold text-white">Market Data API</span>
                        </div>
                        <p className="text-xs text-slate-500">Yahoo Finance for real-time stock data.</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Active
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2 opacity-50">
                        <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-white">Add Connection</span>
                        </div>
                        <p className="text-xs text-slate-500">Configure additional integrations.</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Coming Soon
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Feedback Tab Content
    // ─────────────────────────────────────────────────────────────────────────────
    const renderSymbolsTab = () => (
        <div className="space-y-6">
            <div className="glass-panel rounded-xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-sky-300" />
                        <div>
                            <h3 className="text-lg font-semibold">Stock Symbols</h3>
                            <p className="text-xs text-slate-500">All available stock symbols from OHCLV database.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-300">{symbols.length}</span></span>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-slate-800 hover:bg-slate-700"
                            onClick={fetchSymbols}
                            disabled={symbolsLoading}
                        >
                            {symbolsLoading ? <SimpleSpinner size={16} /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {symbolsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <RubikLoader label="Loading symbols..." />
                    </div>
                ) : symbols.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No symbols found. Run OHCLV data loader to populate symbols.</p>
                    </div>
                ) : (
                    <div className="overflow-auto max-h-[600px]">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {symbols.map((symbol) => (
                                <div
                                    key={symbol}
                                    className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/dashboard/stocks/${encodeURIComponent(symbol)}`)}
                                    title={`View ${symbol} details`}
                                >
                                    {symbol}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFeedbackTab = () => (
        <div className="space-y-6">
            <section className="glass-panel rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-semibold">User Feedback & Requests</h3>
                    </div>
                    <Button
                        variant="secondary"
                        className="bg-slate-800 hover:bg-slate-700 text-xs"
                        onClick={fetchFeedback}
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                </div>
                {feedbackList.length === 0 ? (
                    <p className="text-slate-500 text-sm">No feedback submitted yet.</p>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-auto pr-2">
                        {feedbackList.map((fb) => {
                            const typeIcon = fb.feedback_type === "feature_request" ? Lightbulb : fb.feedback_type === "bug_report" ? Bug : MessageSquarePlus;
                            const TypeIcon = typeIcon;
                            const typeColor = fb.feedback_type === "feature_request" ? "text-amber-400" : fb.feedback_type === "bug_report" ? "text-rose-400" : "text-sky-400";
                            return (<div key={fb.id} className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <TypeIcon className={cn("h-4 w-4", typeColor)} />
                                        <span className="font-semibold text-white">{fb.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={fb.status}
                                            onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                                            disabled={updatingFeedbackId === fb.id}
                                            className="text-[11px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="reviewed">Reviewed</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {fb.user?.full_name || fb.user?.email || "Unknown"} • {fb.feedback_type.replace("_", " ")} • {new Date(fb.created_at).toLocaleDateString()}
                                </p>
                                {fb.description && (
                                    <p className="text-sm text-slate-400">{fb.description}</p>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
            {/* Left Navigation Panel */}
            <aside className="w-52 flex-shrink-0 border-r border-slate-800 bg-slate-950/30 flex flex-col h-full">
                <div className="p-3 border-b border-slate-800/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/30">
                            <Shield className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold leading-none">Admin</h1>
                            <p className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">Console</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
                    {adminTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all",
                                    activeTab === tab.key
                                        ? "bg-sky-500/10 text-sky-100 border border-sky-500/20"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                                )}
                            >
                                <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", activeTab === tab.key ? "text-sky-400" : "text-slate-500")} />
                                <div>
                                    <p className="font-medium text-xs">{tab.label}</p>
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto min-w-0 bg-slate-900">
                <div className="p-4 max-w-7xl">
                    <div className="mb-3">
                        <h2 className="text-xl font-bold">{adminTabs.find(t => t.key === activeTab)?.label}</h2>
                        <p className="text-slate-400 text-xs">{adminTabs.find(t => t.key === activeTab)?.description}</p>
                    </div>

                    {activeTab === "processors" && renderProcessorsTab()}
                    {activeTab === "symbols" && renderSymbolsTab()}
                    {activeTab === "logs" && renderLogsTab()}
                    {activeTab === "accounts" && renderAccountsTab()}
                    {activeTab === "feedback" && renderFeedbackTab()}
                    {activeTab === "connections" && renderConnectionsTab()}
                </div>
            </main>

            {/* Create User Drawer */}
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
                            <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-400 flex items-center justify-center gap-2" disabled={creatingUser}>
                                {creatingUser ? <SimpleSpinner size={16} /> : <Send className="h-4 w-4" />}
                                Create User
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Viewer Modal */}
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
                                    <SimpleSpinner size={24} />
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

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCancelSchedule();
                        }
                    }}
                >
                    <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">{editingSchedule ? "Edit Schedule" : "Create Schedule"}</h3>
                                <p className="text-xs text-slate-500">Configure automatic OHCLV data loading</p>
                            </div>
                            <button className="text-slate-500 hover:text-white" onClick={handleCancelSchedule}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase text-slate-500 mb-2 block">Schedule Type</label>
                                <select
                                    value={scheduleForm.schedule_type}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value as any })}
                                    className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 text-sm"
                                >
                                    <option value="daily">Daily (Repeats every day)</option>
                                    <option value="weekly">Weekly (Repeats weekly)</option>
                                    <option value="interval">Interval (Repeats every X hours/minutes)</option>
                                    <option value="once">Once (Run one time only)</option>
                                    <option value="date_range">Date Range (Repeats between dates)</option>
                                </select>
                            </div>

                            {scheduleForm.schedule_type === "daily" && (
                                <div className="space-y-4">
                                    <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-amber-400" />
                                            <span className="text-xs font-medium text-amber-200">Daily Schedule</span>
                                        </div>
                                        <p className="text-xs text-amber-200/70">Job will run every day at the specified time</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 mb-2 block">Hour (0-23)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={scheduleForm.hour}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const clampedVal = Math.max(0, Math.min(23, val));
                                                    setScheduleForm({ ...scheduleForm, hour: clampedVal });
                                                }}
                                                className="bg-slate-900/50 border-slate-800"
                                                placeholder="0-23"
                                            />
                                            {(scheduleForm.hour < 0 || scheduleForm.hour > 23) && (
                                                <p className="text-xs text-rose-400 mt-1">Hour must be between 0-23</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 mb-2 block">Minute (0-59)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={scheduleForm.minute}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const clampedVal = Math.max(0, Math.min(59, val));
                                                    setScheduleForm({ ...scheduleForm, minute: clampedVal });
                                                }}
                                                className="bg-slate-900/50 border-slate-800"
                                                placeholder="0-59"
                                            />
                                            {(scheduleForm.minute < 0 || scheduleForm.minute > 59) && (
                                                <p className="text-xs text-rose-400 mt-1">Minute must be between 0-59</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-md bg-slate-800/50 border border-slate-700 p-2">
                                        <p className="text-xs text-slate-400">
                                            <span className="text-amber-300 font-medium">Selected time:</span>{" "}
                                            {String(scheduleForm.hour).padStart(2, "0")}:{String(scheduleForm.minute).padStart(2, "0")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {scheduleForm.schedule_type === "weekly" && (
                                <div className="space-y-4">
                                    <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-amber-400" />
                                            <span className="text-xs font-medium text-amber-200">Weekly Schedule</span>
                                        </div>
                                        <p className="text-xs text-amber-200/70">Job will run once per week on the selected day and time</p>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Day of Week</label>
                                        <select
                                            value={scheduleForm.day_of_week}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                                            className="w-full rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2 text-sm"
                                        >
                                            <option value="0">Monday</option>
                                            <option value="1">Tuesday</option>
                                            <option value="2">Wednesday</option>
                                            <option value="3">Thursday</option>
                                            <option value="4">Friday</option>
                                            <option value="5">Saturday</option>
                                            <option value="6">Sunday</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 mb-2 block">Hour (0-23)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={scheduleForm.hour}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const clampedVal = Math.max(0, Math.min(23, val));
                                                    setScheduleForm({ ...scheduleForm, hour: clampedVal });
                                                }}
                                                className="bg-slate-900/50 border-slate-800"
                                                placeholder="0-23"
                                            />
                                            {(scheduleForm.hour < 0 || scheduleForm.hour > 23) && (
                                                <p className="text-xs text-rose-400 mt-1">Hour must be between 0-23</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 mb-2 block">Minute (0-59)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={scheduleForm.minute}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const clampedVal = Math.max(0, Math.min(59, val));
                                                    setScheduleForm({ ...scheduleForm, minute: clampedVal });
                                                }}
                                                className="bg-slate-900/50 border-slate-800"
                                                placeholder="0-59"
                                            />
                                            {(scheduleForm.minute < 0 || scheduleForm.minute > 59) && (
                                                <p className="text-xs text-rose-400 mt-1">Minute must be between 0-59</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-md bg-slate-800/50 border border-slate-700 p-2">
                                        <p className="text-xs text-slate-400">
                                            <span className="text-amber-300 font-medium">Selected schedule:</span>{" "}
                                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][scheduleForm.day_of_week]} at{" "}
                                            {String(scheduleForm.hour).padStart(2, "0")}:{String(scheduleForm.minute).padStart(2, "0")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {scheduleForm.schedule_type === "interval" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Quick Presets</label>
                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            {[
                                                { label: "1h", hours: 1 },
                                                { label: "6h", hours: 6 },
                                                { label: "12h", hours: 12 },
                                                { label: "24h", hours: 24 }
                                            ].map((preset) => (
                                                <button
                                                    key={preset.hours}
                                                    type="button"
                                                    onClick={() => setScheduleForm({
                                                        ...scheduleForm,
                                                        interval_hours: preset.hours,
                                                        interval_minutes: 0
                                                    })}
                                                    className={cn(
                                                        "px-3 py-2 rounded-md text-xs font-medium border transition-all",
                                                        scheduleForm.interval_hours === preset.hours && scheduleForm.interval_minutes === 0
                                                            ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                                                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                                                    )}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-800 pt-4">
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Custom Hours</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="8760"
                                            placeholder="Enter hours (0-8760)"
                                            value={scheduleForm.interval_hours > 0 ? scheduleForm.interval_hours : ""}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0 && val <= 8760) {
                                                    setScheduleForm({
                                                        ...scheduleForm,
                                                        interval_hours: val,
                                                        interval_minutes: val > 0 ? 0 : scheduleForm.interval_minutes
                                                    });
                                                }
                                            }}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Maximum: 8760 hours (1 year)</p>
                                    </div>

                                    <div className="text-center text-slate-400 text-xs font-medium">OR</div>

                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Custom Minutes</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="59"
                                            placeholder="Enter minutes (1-59)"
                                            value={scheduleForm.interval_hours === 0 && scheduleForm.interval_minutes > 0 ? scheduleForm.interval_minutes : ""}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 1 && val <= 59) {
                                                    setScheduleForm({
                                                        ...scheduleForm,
                                                        interval_minutes: val,
                                                        interval_hours: 0
                                                    });
                                                }
                                            }}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Note: For intervals ≥ 60 minutes, use hours instead</p>
                                    </div>

                                    {(scheduleForm.interval_hours > 0 || scheduleForm.interval_minutes > 0) && (
                                        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-400" />
                                                <div className="text-sm">
                                                    <span className="text-amber-200 font-medium">
                                                        Schedule will run every{" "}
                                                        {scheduleForm.interval_hours > 0
                                                            ? `${scheduleForm.interval_hours} hour${scheduleForm.interval_hours > 1 ? "s" : ""}`
                                                            : `${scheduleForm.interval_minutes} minute${scheduleForm.interval_minutes > 1 ? "s" : ""}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {scheduleForm.schedule_type === "once" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Run Date</label>
                                        <Input
                                            type="date"
                                            value={scheduleForm.start_date}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Run Time</label>
                                        <Input
                                            type="time"
                                            value={scheduleForm.start_time}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                </div>
                            )}

                            {scheduleForm.schedule_type === "date_range" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Start Date</label>
                                        <Input
                                            type="date"
                                            value={scheduleForm.start_date}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">Start Time</label>
                                        <Input
                                            type="time"
                                            value={scheduleForm.start_time}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">End Date</label>
                                        <Input
                                            type="date"
                                            value={scheduleForm.end_date}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 mb-2 block">End Time</label>
                                        <Input
                                            type="time"
                                            value={scheduleForm.end_time}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                                            className="bg-slate-900/50 border-slate-800"
                                        />
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        <p>Note: For date range, select interval type (daily/weekly/interval) to determine how often to repeat within the date range.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={scheduleForm.is_active}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                                    className="rounded border-slate-700 bg-slate-900"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={handleCancelSchedule}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-amber-600 hover:bg-amber-500"
                                    onClick={handleCreateSchedule}
                                >
                                    {editingSchedule ? "Update" : "Create"} Schedule
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Pending User Modal */}
            {showApproveModal && selectedPendingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700/50 p-6 space-y-4 bg-slate-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <User className="h-6 w-6 text-emerald-400" />
                                <h2 className="text-xl font-bold text-white">Approve User Request</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowApproveModal(false);
                                    setSelectedPendingUser(null);
                                    setApprovePassword("");
                                }}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">UserID</p>
                                <p className="text-sm font-mono text-emerald-300">{selectedPendingUser.userid}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Name</p>
                                <p className="text-sm text-white">{selectedPendingUser.full_name || "—"}</p>
                            </div>
                            {selectedPendingUser.email && (
                                <div>
                                    <p className="text-xs uppercase text-slate-500 mb-1">Email</p>
                                    <p className="text-sm text-white">{selectedPendingUser.email}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs uppercase text-slate-500 mb-1 block">Set Password</label>
                                <Input
                                    type="password"
                                    value={approvePassword}
                                    onChange={(e) => setApprovePassword(e.target.value)}
                                    className="bg-slate-900/50 border-slate-700 text-white"
                                    placeholder="Enter password for new user"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowApproveModal(false);
                                    setSelectedPendingUser(null);
                                    setApprovePassword("");
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleApprovePendingUser(selectedPendingUser.id)}
                                disabled={!approvePassword || approvingUserId === selectedPendingUser.id}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white"
                            >
                                {approvingUserId === selectedPendingUser.id ? (
                                    <SimpleSpinner size={16} />
                                ) : (
                                    "Approve & Create Account"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Details Modal */}
            {showDetailsModal && selectedUserDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 p-6 space-y-4 bg-slate-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Eye className="h-6 w-6 text-sky-400" />
                                <h2 className="text-xl font-bold text-white">User Full Details</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setSelectedUserDetails(null);
                                }}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Full Name</p>
                                <p className="text-white">{selectedUserDetails.full_name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Email</p>
                                <p className="text-white">{selectedUserDetails.email}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">UserID</p>
                                <p className="text-sky-300 font-mono">{selectedUserDetails.userid || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Role</p>
                                <p className="text-white">{selectedUserDetails.role}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Phone Number</p>
                                <p className="text-white">{selectedUserDetails.phone_number || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">State</p>
                                <p className="text-white">{selectedUserDetails.state || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Country</p>
                                <p className="text-white">{selectedUserDetails.country || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Account Status</p>
                                <p className={cn(
                                    "font-semibold",
                                    selectedUserDetails.is_active ? "text-emerald-300" : "text-slate-400"
                                )}>
                                    {selectedUserDetails.is_active ? "Enabled" : "Disabled"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Last Activity</p>
                                <p className="text-white">
                                    {selectedUserDetails.last_activity 
                                        ? new Date(selectedUserDetails.last_activity).toLocaleString()
                                        : "Never"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">City</p>
                                <p className="text-white">{selectedUserDetails.city || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Postal Code</p>
                                <p className="text-white">{selectedUserDetails.postal_code || "—"}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs uppercase text-slate-500 mb-1">Address Line 1</p>
                                <p className="text-white">{selectedUserDetails.address_line1 || "—"}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs uppercase text-slate-500 mb-1">Address Line 2</p>
                                <p className="text-white">{selectedUserDetails.address_line2 || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Age</p>
                                <p className="text-white">{selectedUserDetails.age || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 mb-1">Created At</p>
                                <p className="text-white">
                                    {selectedUserDetails.created_at 
                                        ? new Date(selectedUserDetails.created_at).toLocaleString()
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setSelectedUserDetails(null);
                                }}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
