"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Send, KeyRound, MapPin, User2, LogOut, Edit3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RubikLoader } from "@/components/RubikLoader";

type Profile = {
    id: number;
    email: string;
    full_name?: string;
    phone_number?: string;
    age?: number;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    telegram_chat_id?: string;
    role: string;
};

type ChangeRequest = {
    id: number;
    request_type: string;
    status: string;
    details?: string;
    created_at: string;
    resolved_at?: string;
};

type MessageState = { type: "success" | "error"; text: string } | null;

const initialProfileState: Profile = {
    id: 0,
    email: "",
    role: "",
};

export default function AccountsPage() {
    const [profile, setProfile] = useState<Profile>(initialProfileState);
    const [profileForm, setProfileForm] = useState({
        full_name: "",
        phone_number: "",
        age: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        telegram_chat_id: "",
        otp_code: "",
    });
    const [passwordForm, setPasswordForm] = useState({
        new_password: "",
        confirm_password: "",
        otp_code: "",
    });
    const [loading, setLoading] = useState(true);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [profileMessage, setProfileMessage] = useState<MessageState>(null);
    const [passwordMessage, setPasswordMessage] = useState<MessageState>(null);
    const [otpStatus, setOtpStatus] = useState<MessageState>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const response = await api.get("/auth/users/me/profile");
                setProfile(response.data);
                setProfileForm((prev) => ({
                    ...prev,
                    full_name: response.data.full_name || "",
                    phone_number: response.data.phone_number || "",
                    age: response.data.age?.toString() || "",
                    address_line1: response.data.address_line1 || "",
                    address_line2: response.data.address_line2 || "",
                    city: response.data.city || "",
                    state: response.data.state || "",
                    postal_code: response.data.postal_code || "",
                    country: response.data.country || "",
                    telegram_chat_id: response.data.telegram_chat_id || "",
                }));
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };

        const loadRequests = async () => {
            setLoadingRequests(true);
            try {
                const response = await api.get("/auth/users/me/change-requests");
                setChangeRequests(response.data);
            } catch (error) {
                console.error("Failed to load change requests", error);
            } finally {
                setLoadingRequests(false);
            }
        };

        loadProfile();
        loadRequests();
    }, []);

    const handleProfileInput =
        (field: keyof typeof profileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setProfileForm((prev) => ({ ...prev, [field]: e.target.value }));
        };

    const handlePasswordInput =
        (field: keyof typeof passwordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
        };

    const requestOtp = async (purpose: "PROFILE_UPDATE" | "PASSWORD_CHANGE") => {
        setOtpStatus(null);
        try {
            const response = await api.post("/auth/otp/request", { purpose });
            const debugCode = response.data?.debug_code as string | undefined;
            setOtpStatus({
                type: "success",
                text: debugCode
                    ? `OTP sent via Telegram (code: ${debugCode})`
                    : `OTP sent for ${purpose.replace("_", " ").toLowerCase()}.`,
            });
            if (debugCode) {
                if (purpose === "PROFILE_UPDATE") {
                    setProfileForm((prev) => ({ ...prev, otp_code: debugCode }));
                } else {
                    setPasswordForm((prev) => ({ ...prev, otp_code: debugCode }));
                }
            }
        } catch (error) {
            console.error("Failed to send OTP", error);
            const err = error as { response?: { data?: { detail?: string } } };
            setOtpStatus({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to send OTP. Please try later.",
            });
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMessage(null);
        try {
            const payload = {
                ...profileForm,
                age: profileForm.age ? Number(profileForm.age) : undefined,
            };
            const response = await api.put("/auth/users/me/profile", payload);
            setProfile(response.data);
            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (error) {
            console.error("Profile update failed", error);
            const err = error as { response?: { data?: { detail?: string } } };
            setProfileMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to update profile.",
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordMessage({ type: "error", text: "Passwords do not match." });
            return;
        }
        setChangingPassword(true);
        setPasswordMessage(null);
        try {
            const response = await api.post("/auth/users/me/password", {
                new_password: passwordForm.new_password,
                otp_code: passwordForm.otp_code,
            });
            setProfile(response.data);
            setPasswordForm({ new_password: "", confirm_password: "", otp_code: "" });
            setPasswordMessage({ type: "success", text: "Password updated successfully." });
        } catch (error) {
            console.error("Password update failed", error);
            const err = error as { response?: { data?: { detail?: string } } };
            setPasswordMessage({
                type: "error",
                text: err.response?.data?.detail ?? "Unable to update password.",
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const profileReady = useMemo(() => Boolean(profile.email), [profile.email]);

    const formatDate = (value?: string) => {
        if (!value) return "—";
        return new Date(value).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
                <RubikLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 pl-72">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-10 w-10 text-sky-400" />
                        <div>
                            <h1 className="text-3xl font-semibold">Account Security</h1>
                            <p className="text-slate-400 text-sm">
                                Manage your contact details, passwords, and Telegram notifications in one place.
                            </p>
                        </div>
                    </div>
                </header>

                {profileReady && (
                    <section className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase text-slate-500 tracking-[0.15em] mb-1">Login Details</p>
                            <h3 className="text-lg font-semibold text-white">{profile.email}</h3>
                            <p className="text-sm text-slate-400">
                                Password: <span className="font-mono tracking-widest text-slate-200">••••••••</span> (hidden for security)
                            </p>
                            <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                                <span className="px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-200">{profile.role}</span>
                                <span className="text-slate-500">User ID visible above</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <Button
                                onClick={() => {
                                    document.getElementById("password-form")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="bg-amber-500 hover:bg-amber-400 w-full md:w-48 flex items-center justify-center gap-2"
                            >
                                <Edit3 className="h-4 w-4" />
                                Request Change
                            </Button>
                            <Button
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("role");
                                    window.location.href = "/";
                                }}
                                variant="secondary"
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 w-full md:w-48 flex items-center justify-center gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </section>
                )}

                {profileReady && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5" id="password-form">
                            <div className="flex items-center gap-3">
                                <User2 className="h-5 w-5 text-sky-300" />
                                <div>
                                    <h2 className="text-xl font-semibold">Personal Details</h2>
                                    <p className="text-xs text-slate-500">Fields that admins can view for account verification.</p>
                                </div>
                            </div>

                            {profileMessage && (
                                <div
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        profileMessage.type === "success"
                                            ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                            : "border-red-500/40 text-red-300 bg-red-500/10"
                                    }`}
                                >
                                    {profileMessage.text}
                                </div>
                            )}

                            {otpStatus && (
                                <div
                                    className={`rounded-lg border px-3 py-2 text-xs ${
                                        otpStatus.type === "success"
                                            ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                            : "border-red-500/40 text-red-300 bg-red-500/10"
                                    }`}
                                >
                                    {otpStatus.text}
                                </div>
                            )}

                            <form className="space-y-4" onSubmit={handleProfileSubmit}>
                                <div className="grid grid-cols-1 gap-3">
                                    <label className="text-xs uppercase text-slate-500">Email</label>
                                    <Input readOnly value={profile.email} className="bg-slate-900/60 border-slate-800" />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Full Name</label>
                                        <Input
                                            value={profileForm.full_name}
                                            onChange={handleProfileInput("full_name")}
                                            placeholder="Full name"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Phone</label>
                                        <Input
                                            value={profileForm.phone_number}
                                            onChange={handleProfileInput("phone_number")}
                                            placeholder="+91 90000 00000"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Age</label>
                                        <Input
                                            type="number"
                                            value={profileForm.age}
                                            onChange={handleProfileInput("age")}
                                            placeholder="25"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">State</label>
                                        <Input
                                            value={profileForm.state}
                                            onChange={handleProfileInput("state")}
                                            placeholder="Karnataka"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Country</label>
                                        <Input
                                            value={profileForm.country}
                                            onChange={handleProfileInput("country")}
                                            placeholder="India"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500 flex items-center gap-2">
                                        Address <MapPin className="h-4 w-4 text-slate-500" />
                                    </label>
                                    <Input
                                        value={profileForm.address_line1}
                                        onChange={handleProfileInput("address_line1")}
                                        placeholder="Street / Building"
                                        className="bg-slate-900/60 border-slate-800 mt-1"
                                    />
                                    <Input
                                        value={profileForm.address_line2}
                                        onChange={handleProfileInput("address_line2")}
                                        placeholder="Apartment / Landmark"
                                        className="bg-slate-900/60 border-slate-800 mt-2"
                                    />
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">City</label>
                                        <Input
                                            value={profileForm.city}
                                            onChange={handleProfileInput("city")}
                                            placeholder="City"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Pin Code</label>
                                        <Input
                                            value={profileForm.postal_code}
                                            onChange={handleProfileInput("postal_code")}
                                            placeholder="560001"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500">Telegram Chat ID</label>
                                        <Input
                                            value={profileForm.telegram_chat_id}
                                            onChange={handleProfileInput("telegram_chat_id")}
                                            placeholder="@username or numeric ID"
                                            className="bg-slate-900/60 border-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Input
                                        value={profileForm.otp_code}
                                        onChange={handleProfileInput("otp_code")}
                                        placeholder="Enter OTP"
                                        className="bg-slate-900/60 border-slate-800"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => requestOtp("PROFILE_UPDATE")}
                                        className="bg-slate-800 hover:bg-slate-700"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Request OTP
                                    </Button>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="w-full bg-sky-500 hover:bg-sky-400 text-white"
                                >
                                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
                                </Button>
                            </form>
                        </section>

                        <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
                            <div className="flex items-center gap-3">
                                <KeyRound className="h-5 w-5 text-orange-300" />
                                <div>
                                    <h2 className="text-xl font-semibold">Password & OTP</h2>
                                    <p className="text-xs text-slate-500">
                                        All password changes require OTP verification sent to your Telegram ID.
                                    </p>
                                </div>
                            </div>

                            {passwordMessage && (
                                <div
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        passwordMessage.type === "success"
                                            ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                            : "border-red-500/40 text-red-300 bg-red-500/10"
                                    }`}
                                >
                                    {passwordMessage.text}
                                </div>
                            )}

                            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                                <div>
                                    <label className="text-xs uppercase text-slate-500">New Password</label>
                                    <Input
                                        type="password"
                                        value={passwordForm.new_password}
                                        onChange={handlePasswordInput("new_password")}
                                        placeholder="••••••••"
                                        className="bg-slate-900/60 border-slate-800"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={passwordForm.confirm_password}
                                        onChange={handlePasswordInput("confirm_password")}
                                        placeholder="••••••••"
                                        className="bg-slate-900/60 border-slate-800"
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={passwordForm.otp_code}
                                        onChange={handlePasswordInput("otp_code")}
                                        placeholder="Enter OTP"
                                        className="bg-slate-900/60 border-slate-800"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => requestOtp("PASSWORD_CHANGE")}
                                        className="bg-slate-800 hover:bg-slate-700"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Request OTP
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-white"
                                >
                                    {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                                </Button>
                            </form>

                            <div className="p-4 mt-6 rounded-xl bg-slate-900/60 border border-slate-800">
                                <p className="text-xs text-slate-500 mb-2 font-medium uppercase">Security tips</p>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li>• Keep your Telegram chat ID up to date to receive OTPs.</li>
                                    <li>• OTPs expire after 10 minutes for your safety.</li>
                                    <li>• Contact an admin if you do not receive the notification.</li>
                                </ul>
                            </div>
                        </section>
                    </div>
                )}

                {profileReady && (
                    <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="h-5 w-5 text-emerald-300" />
                            <div>
                                <h2 className="text-xl font-semibold">Change Request Log</h2>
                                <p className="text-xs text-slate-500">Track every profile or password update you have made.</p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 overflow-hidden">
                            <div className="grid grid-cols-4 bg-slate-900/70 text-xs uppercase tracking-wide text-slate-500">
                                <span className="px-4 py-3">Type</span>
                                <span className="px-4 py-3">Status</span>
                                <span className="px-4 py-3">Details</span>
                                <span className="px-4 py-3">Requested</span>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {loadingRequests ? (
                                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-slate-400">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading change history...
                                    </div>
                                ) : changeRequests.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-slate-500">No change requests recorded yet.</div>
                                ) : (
                                    changeRequests.map((request) => (
                                        <div key={request.id} className="grid grid-cols-4 text-sm text-slate-200">
                                            <span className="px-4 py-3 font-semibold">{request.request_type.replace("_", " ")}</span>
                                            <span className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-semibold",
                                                        request.status === "completed"
                                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                            : "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30"
                                                    )}
                                                >
                                                    {request.status}
                                                </span>
                                            </span>
                                            <span className="px-4 py-3 text-slate-400 text-xs">{request.details || "—"}</span>
                                            <span className="px-4 py-3 text-slate-400 text-xs">{formatDate(request.created_at)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

