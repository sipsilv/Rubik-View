"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type SidebarState = {
  collapsed: boolean;
  isLoaded: boolean;
};

export function useSidebarCollapsed(): SidebarState {
  const [state, setState] = useState<SidebarState>({
    collapsed: false,
    isLoaded: false,
  });
  const mountedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    mountedRef.current = true;

    // Load initial state synchronously on mount
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
    // Use queueMicrotask to defer state update and avoid updating during render
    const handler = (event: Event) => {
      if (!mountedRef.current) return;
      
      const custom = event as CustomEvent<{ collapsed: boolean }>;
      if (custom.detail && typeof custom.detail.collapsed === "boolean") {
        // Defer state update using queueMicrotask to avoid updating during render
        queueMicrotask(() => {
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              collapsed: custom.detail.collapsed,
            }));
          }
        });
      }
    };

    window.addEventListener("sidebar-collapse-changed", handler as EventListener);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener("sidebar-collapse-changed", handler as EventListener);
    };
  }, []); // Empty dependency array - only run once on mount

  return state;
}
