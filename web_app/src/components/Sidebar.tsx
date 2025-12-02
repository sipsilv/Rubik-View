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

    const sidebarWidth = collapsed ? 68 : 224;

    return (
        <aside
            className="flex h-screen flex-col border-r border-slate-800/50 bg-slate-950/95 backdrop-blur-xl fixed left-0 top-0 z-50 py-4"
            style={{
                width: sidebarWidth,
                paddingLeft: collapsed ? 8 : 12,
                paddingRight: collapsed ? 8 : 12,
            }}
        >
            {/* Logo Section */}
            <div className="flex items-center justify-center mb-2 px-1">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <RubikCube size={collapsed ? 30 : 34} />
                    {!collapsed && (
                        <div className="leading-tight overflow-hidden">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">Rubik</p>
                            <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">View</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Collapse Toggle Button - Always below logo */}
            <div className="flex justify-center mb-4">
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
                                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                                isActive
                                    ? "bg-sky-500/15 text-sky-100 border border-sky-500/30"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent",
                                collapsed && "justify-center px-2"
                            )}
                            title={collapsed ? link.label : undefined}
                        >
                            <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive ? "text-sky-300" : "text-slate-500")} />
                            {!collapsed && <span className="truncate">{link.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Sign Out */}
            <div className="mt-auto pt-3 border-t border-slate-800/50">
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("role");
                        window.location.href = "/";
                    }}
                    className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border border-slate-800/40 px-2.5 py-2 text-[13px] font-medium text-slate-400 transition-all hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-300",
                        collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? "Sign Out" : undefined}
                >
                    <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
