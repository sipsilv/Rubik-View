"use client";

import { useEffect, useState } from "react";

export function useSidebarCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("sidebarCollapsed");
      if (stored === "1") {
        setCollapsed(true);
      }
    } catch {
      // ignore
    }

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ collapsed: boolean }>;
      if (custom.detail && typeof custom.detail.collapsed === "boolean") {
        setCollapsed(custom.detail.collapsed);
      }
    };

    window.addEventListener("sidebar-collapse-changed", handler as EventListener);
    return () => window.removeEventListener("sidebar-collapse-changed", handler as EventListener);
  }, []);

  return collapsed;
}


