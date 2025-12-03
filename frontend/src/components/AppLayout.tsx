"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import SimpleSpinner from "@/components/SimpleSpinner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";

interface AppLayoutProps {
    children: React.ReactNode;
}

/**
 * Layout wrapper that adds sidebar to all authenticated pages
 * Shows loader until sidebar state is loaded to prevent glitches
 * Login page (/) is excluded from having sidebar
 */
export function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname();
    const { collapsed, isLoaded } = useSidebarCollapsed();

    // Don't show sidebar on login page
    const isLoginPage = pathname === "/";

    // Initialize inactivity timer for protected pages
    // This will handle session expiry and inactivity logout
    // The hook will check internally if user is authenticated
    useInactivityTimer();

    if (isLoginPage) {
        return <>{children}</>;
    }

    // Show loader until sidebar state is loaded
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <SimpleSpinner size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Sidebar />
            <main
                style={{
                    marginLeft: collapsed ? 64 : 200,
                }}
                className="min-h-screen"
            >
                {children}
            </main>
        </div>
    );
}

export default AppLayout;
