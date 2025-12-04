"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    LineChart,
    Settings,
    LogOut,
    Activity,
    Shield,
    UserCircle2,
    ChevronLeft,
    ChevronRight,
    MessageSquarePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import RubikCube from "@/components/RubikCube";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";

// Read initial state synchronously to prevent flash
const getInitialCollapsed = (): boolean => {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
        return false;
    }
};

const Sidebar = () => {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(getInitialCollapsed);
    const [mounted, setMounted] = useState(false);
    const { formattedTimeRemaining, showCountdown } = useInactivityTimer();

    useEffect(() => {
        setMounted(true);
        setRole(localStorage.getItem("role"));
        // Re-sync collapsed state after mount
        const stored = localStorage.getItem("sidebarCollapsed");
        setCollapsed(stored === "1");
    }, []);

    const toggleCollapse = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("sidebar-collapse-changed", {
                            detail: { collapsed: next },
                        }),
                    );
                }
            } catch {
                // ignore
            }
            return next;
        });
    };

    // Always show Admin link - it will be filtered by backend if not authorized
    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/stocks", label: "Scanner", icon: Activity },
        { href: "/dashboard/analysis", label: "Analysis", icon: LineChart },
        { href: "/accounts", label: "Accounts", icon: UserCircle2 },
        { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ];

    // Only add Admin link after mounted and if user has admin role
    if (mounted && (role === "admin" || role === "superadmin")) {
        links.push({ href: "/admin", label: "Admin", icon: Shield });
    }

    const isLinkActive = (link: { href: string; exact?: boolean }) => {
        if (link.exact) {
            return pathname === link.href;
        }
        if (link.href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname === link.href || pathname.startsWith(link.href + "/");
    };

    const sidebarWidth = collapsed ? 64 : 200;

    return (
        <aside
            className="flex h-screen flex-col border-r border-slate-800/50 bg-slate-950/95 backdrop-blur-xl fixed left-0 top-0 z-50 py-2"
            style={{
                width: sidebarWidth,
                paddingLeft: collapsed ? 6 : 10,
                paddingRight: collapsed ? 6 : 10,
            }}
        >
            {/* Logo Section */}
            <div className="flex items-center justify-center mb-1 px-1">
                <Link href="/dashboard" className="flex items-center gap-1.5 group">
                    <RubikCube size={collapsed ? 28 : 32} />
                    {!collapsed && (
                        <div className="leading-tight overflow-hidden">
                            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-500">Rubik</p>
                            <p className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">View</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Collapse Toggle Button - Always below logo */}
            <div className="flex justify-center mb-2">
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-0.5">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(link);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors duration-150",
                                isActive
                                    ? "bg-sky-500/15 text-sky-100 border border-sky-500/30"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent",
                                collapsed && "justify-center px-1.5"
                            )}
                            title={collapsed ? link.label : undefined}
                        >
                            <Icon className={cn("h-[16px] w-[16px] flex-shrink-0", isActive ? "text-sky-300" : "text-slate-500")} />
                            {!collapsed && <span className="truncate">{link.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Sign Out */}
            <div className="mt-auto pt-2 border-t border-slate-800/50 relative">
                <button
                    onClick={() => {
                        import("@/lib/api").then(({ default: api }) => {
                            api.post("/auth/logout").finally(() => {
                                import("@/lib/auth").then(({ logout }) => logout());
                            });
                        });
                    }}
                    className={cn(
                        "flex w-full items-center gap-2 rounded-lg border border-slate-800/40 px-2 py-1.5 text-[12px] font-medium text-slate-400 transition-all hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-300",
                        collapsed && "justify-center px-1.5",
                        showCountdown && "border-amber-500/40 hover:border-amber-500/60"
                    )}
                    title={collapsed ? (showCountdown ? `Sign Out (${formattedTimeRemaining})` : "Sign Out") : undefined}
                >
                    <LogOut className="h-[16px] w-[16px] flex-shrink-0" />
                    {!collapsed && (
                        <div className="flex items-center justify-between w-full gap-2">
                            <span>Sign Out</span>
                            {showCountdown && formattedTimeRemaining && (
                                <span className="text-amber-400 font-mono text-[11px] font-semibold ml-auto px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 animate-pulse">
                                    {formattedTimeRemaining}
                                </span>
                            )}
                        </div>
                    )}
                    {collapsed && showCountdown && formattedTimeRemaining && (
                        <span className="absolute -top-1 -right-1 text-amber-400 font-mono text-[9px] font-semibold px-1 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
                            {formattedTimeRemaining}
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
