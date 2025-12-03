"use client";

import { useEffect, useState, useTransition } from "react";

type SidebarState = {
  collapsed: boolean;
  isLoaded: boolean;
};

export function useSidebarCollapsed(): SidebarState {
  const [state, setState] = useState<SidebarState>({
    collapsed: false,
    isLoaded: false,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load initial state
    try {
      const stored = window.localStorage.getItem("sidebarCollapsed");
      setState({
        collapsed: stored === "1",
        isLoaded: true,
      });
    } catch {
      setState({
        collapsed: false,
        isLoaded: true,
      });
    }

    // Set up event listener for sidebar changes
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ collapsed: boolean }>;
      if (custom.detail && typeof custom.detail.collapsed === "boolean") {
        // Defer state update to avoid updating during render
        startTransition(() => {
          setState(prev => ({
            ...prev,
            collapsed: custom.detail.collapsed,
          }));
        });
      }
    };

    window.addEventListener("sidebar-collapse-changed", handler as EventListener);
    return () => window.removeEventListener("sidebar-collapse-changed", handler as EventListener);
  }, [startTransition]);

  return state;
}
