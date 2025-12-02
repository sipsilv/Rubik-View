"use client";

import { useEffect, useState } from "react";
import { Shield, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IndicatorsPanel } from "@/components/IndicatorsPanel";

type TabId = "general" | "indicators";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("role"));
    }
  }, []);

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/30">
              <SlidersHorizontal className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Settings
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold">Workspace Settings</h1>
              <p className="text-slate-400 text-sm">
                Configure your Rubik View environment and advanced signal options.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-slate-900/70 border border-slate-700 p-1">
              <button
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full font-medium",
                  activeTab === "general"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-400 hover:text-slate-100",
                )}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full font-medium flex items-center gap-1",
                  activeTab === "indicators"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-400 hover:text-slate-100",
                )}
                onClick={() => setActiveTab("indicators")}
              >
                Indicators
                {isAdmin && <Shield className="h-3 w-3 text-sky-500" />}
              </button>
            </div>
          </div>
        </header>

        {activeTab === "general" && (
          <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold">General Preferences</h2>
            <p className="text-sm text-slate-400">
              You can add more setting groups here later (themes, notifications, layouts, etc.).
            </p>
            <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/40 p-6 text-sm text-slate-500">
              This area is reserved for future settings tabs you mentioned.
            </div>
          </section>
        )}

        {activeTab === "indicators" && (
          <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            {!isAdmin ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <Shield className="h-8 w-8 text-slate-500" />
                <p className="text-sm text-slate-400">
                  Indicator configuration is only available to admin users.
                </p>
              </div>
            ) : (
              <IndicatorsPanel variant="embedded" />
            )}
          </section>
        )}
      </div>
    </div>
  );
}


