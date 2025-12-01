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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const Sidebar = () => {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setRole(localStorage.getItem("role"));
        try {
            const stored = localStorage.getItem("sidebarCollapsed");
            if (stored === "1") {
                setCollapsed(true);
            }
        } catch {
            // ignore
        }
    }, []);

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/stocks", label: "Scanner", icon: Activity },
        { href: "/dashboard/analysis", label: "Analysis", icon: LineChart },
        { href: "/accounts", label: "Accounts", icon: UserCircle2 },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ];

    if (role === "admin" || role === "superadmin") {
        links.push({ href: "/admin", label: "Admin", icon: Shield });
        links.push({ href: "/admin/indicators", label: "Indicators", icon: LineChart });
    }

    return (
        <aside
            className={cn(
                "flex h-screen flex-col border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl px-4 py-6 fixed left-0 top-0 z-50 transition-all duration-300",
                collapsed ? "w-20" : "w-64"
            )}
        >
            <div className="mb-8 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 text-xl font-bold text-white">
                        R
                    </div>
                    {!collapsed && (
                        <div className="leading-tight">
                            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Rubik</p>
                            <p className="text-sm font-semibold text-white">Control</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={() =>
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
                        })
                    }
                    className="rounded-full border border-slate-700 bg-slate-900/60 p-1 text-slate-400 hover:text-slate-100 hover:border-slate-500"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            <nav className="flex-1 space-y-1">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                                isActive
                                    ? "bg-sky-500/15 text-sky-100 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.35)]"
                                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-100 border border-transparent",
                                collapsed && "justify-center"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? "text-sky-300" : "text-slate-500")} />
                            {!collapsed && <span className="whitespace-nowrap">{link.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto">
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("role");
                        window.location.href = "/";
                    }}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border border-slate-800/60 px-3 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-500/10 hover:border-red-500/60 hover:text-red-300",
                        collapsed && "justify-center"
                    )}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
