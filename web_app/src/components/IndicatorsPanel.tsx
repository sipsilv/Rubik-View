"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Check, Edit3, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RubikLoader } from "@/components/RubikLoader";
import SimpleSpinner from "@/components/SimpleSpinner";

type IndicatorConfig = {
  id: number;
  indicator_name: string;
  description?: string | null;
  active: boolean;
  parameter_1?: number | null;
  parameter_2?: number | null;
  parameter_3?: number | null;
  manual_weight?: number | null;
  use_ai_weight: boolean;
  ai_latest_weight?: number | null;
  selected?: boolean;
};

type MessageState = { type: "success" | "error"; text: string } | null;

type IndicatorsPanelProps = {
  /** When true, header is more compact (for settings tab). */
  variant?: "standalone" | "embedded";
};

export function IndicatorsPanel({ variant = "standalone" }: IndicatorsPanelProps) {
  const router = useRouter();
  const [accessLoading, setAccessLoading] = useState(true);
  const [rows, setRows] = useState<IndicatorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin" && role !== "superadmin") {
      router.push("/dashboard");
    } else {
      setAccessLoading(false);
    }
  }, [router]);

  const loadIndicators = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get<IndicatorConfig[]>("/admin/indicators");
      setRows(response.data.map((r) => ({ ...r, selected: false })));
    } catch (error) {
      console.error("Failed to load indicators", error);
      setMessage({ type: "error", text: "Unable to load indicators." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessLoading) {
      void loadIndicators();
    }
  }, [accessLoading]);

  const updateField = (id: number, field: keyof IndicatorConfig, value: unknown) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const toggleSelect = (id: number) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)),
    );
  };

  const handleToggleActive = (row: IndicatorConfig) => {
    updateField(row.id, "active", !row.active);
  };

  const handleToggleAi = (row: IndicatorConfig) => {
    updateField(row.id, "use_ai_weight", !row.use_ai_weight);
  };

  const parseNumber = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const handleSaveRow = async (row: IndicatorConfig) => {
    setSavingId(row.id);
    setMessage(null);
    try {
      const payload = {
        indicator_name: row.indicator_name,
        description: row.description ?? null,
        active: row.active,
        parameter_1: row.parameter_1 ?? null,
        parameter_2: row.parameter_2 ?? null,
        parameter_3: row.parameter_3 ?? null,
        manual_weight: row.manual_weight ?? null,
        use_ai_weight: row.use_ai_weight,
        ai_latest_weight: row.ai_latest_weight ?? null,
      };
      await api.put(`/admin/indicators/${row.id}`, payload);
      setMessage({ type: "success", text: "Indicator saved." });
      void loadIndicators();
    } catch (error) {
      console.error("Failed to save indicator", error);
      setMessage({ type: "error", text: "Unable to save indicator." });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRow = async (id: number) => {
    setDeletingId(id);
    setMessage(null);
    try {
      await api.delete(`/admin/indicators/${id}`);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setMessage({ type: "success", text: "Indicator deleted." });
    } catch (error) {
      console.error("Failed to delete indicator", error);
      setMessage({ type: "error", text: "Unable to delete indicator." });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddRow = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const payload = {
        indicator_name: "RSI",
        description: "",
        active: true,
        parameter_1: 14,
        parameter_2: null,
        parameter_3: null,
        manual_weight: 1,
        use_ai_weight: false,
        ai_latest_weight: null,
      };
      await api.post("/admin/indicators", payload);
      setMessage({ type: "success", text: "Indicator added." });
      void loadIndicators();
    } catch (error) {
      console.error("Failed to add indicator", error);
      setMessage({ type: "error", text: "Unable to add indicator." });
    } finally {
      setCreating(false);
    }
  };

  if (accessLoading) {
    return <RubikLoader label="Rubik is loading indicators…" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Indicators
          </p>
          <h1 className={cn("font-bold", variant === "standalone" ? "text-2xl" : "text-lg")}>
            Signal Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose which indicators are active and tune their parameters and weights.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="secondary"
            className="bg-slate-800 hover:bg-slate-700 text-xs"
            onClick={loadIndicators}
            disabled={loading}
          >
            <SimpleSpinner size={16} className={`mr-1 ${loading ? "" : "opacity-0"}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            className="bg-slate-800 hover:bg-slate-700 text-xs"
            onClick={async () => {
              try {
                const res = await api.get("/admin/indicators/template", {
                  responseType: "blob",
                });
                const blob = res.data as Blob;
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "indicator_template.csv");
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error("Failed to download template", error);
                setMessage({
                  type: "error",
                  text: "Unable to download template.",
                });
              }
            }}
          >
            Download Template
          </Button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMessage(null);
              const formData = new FormData();
              formData.append("file", file);
              try {
                const res = await api.post("/admin/indicators/upload", formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                const info = res.data as { created?: number; updated?: number };
                setMessage({
                  type: "success",
                  text: `Indicators uploaded. Created: ${info.created ?? 0}, Updated: ${info.updated ?? 0}.`,
                });
                void loadIndicators();
              } catch (error) {
                console.error("Failed to upload indicators", error);
                setMessage({
                  type: "error",
                  text: "Unable to upload indicators. Please check file format.",
                });
              } finally {
                if (e.target) {
                  e.target.value = "";
                }
              }
            }}
          />
          <Button
            className="bg-sky-500 hover:bg-sky-400 text-xs flex items-center gap-1"
            onClick={() => uploadInputRef.current?.click()}
          >
            Upload File
          </Button>
          <Button
            variant="outline"
            className="bg-slate-800 hover:bg-slate-700 text-xs"
            onClick={() =>
              setRows((prev) => prev.map((r) => ({ ...r, selected: true })))
            }
            disabled={loading || rows.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            className="bg-slate-800 hover:bg-slate-700 text-xs"
            onClick={() =>
              setRows((prev) => prev.map((r) => ({ ...r, selected: false })))
            }
            disabled={loading || rows.length === 0}
          >
            Clear Selection
          </Button>
          <Button
            variant="secondary"
            className="bg-emerald-600 hover:bg-emerald-500 text-xs"
            disabled={loading || bulkUpdating || rows.every((r) => !r.selected)}
            onClick={async () => {
              setBulkUpdating(true);
              setMessage(null);
              try {
                const selected = rows.filter((r) => r.selected);
                for (const row of selected) {
                  await api.put(`/admin/indicators/${row.id}`, { active: true });
                }
                setMessage({ type: "success", text: "Selected indicators enabled." });
                void loadIndicators();
              } catch (error) {
                console.error("Failed to enable selected indicators", error);
                setMessage({
                  type: "error",
                  text: "Unable to enable selected indicators.",
                });
              } finally {
                setBulkUpdating(false);
              }
            }}
          >
            Enable Selected
          </Button>
          <Button
            variant="secondary"
            className="bg-rose-600 hover:bg-rose-500 text-xs"
            disabled={loading || bulkUpdating || rows.every((r) => !r.selected)}
            onClick={async () => {
              setBulkUpdating(true);
              setMessage(null);
              try {
                const selected = rows.filter((r) => r.selected);
                for (const row of selected) {
                  await api.put(`/admin/indicators/${row.id}`, { active: false });
                }
                setMessage({ type: "success", text: "Selected indicators disabled." });
                void loadIndicators();
              } catch (error) {
                console.error("Failed to disable selected indicators", error);
                setMessage({
                  type: "error",
                  text: "Unable to disable selected indicators.",
                });
              } finally {
                setBulkUpdating(false);
              }
            }}
          >
            Disable Selected
          </Button>
          <Button
            className="bg-sky-500 hover:bg-sky-400 text-xs flex items-center gap-1"
            onClick={handleAddRow}
            disabled={creating}
          >
            {creating ? <SimpleSpinner size={16} /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </header>

      {message && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200",
          )}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Select</th>
              <th className="px-3 py-2 text-left">Active (Yes/No)</th>
              <th className="px-3 py-2 text-left">Indicator</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">P1</th>
              <th className="px-3 py-2 text-left">P2</th>
              <th className="px-3 py-2 text-left">P3</th>
              <th className="px-3 py-2 text-left">Manual Wt</th>
              <th className="px-3 py-2 text-left">Use AI</th>
              <th className="px-3 py-2 text-left">AI Wt</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-400">
                  <SimpleSpinner size={16} className="inline-block mr-2" />
                  Loading indicators...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-500">
                  No indicators configured yet. Click &quot;Add&quot; to create one.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/60">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!row.selected}
                      onChange={() => toggleSelect(row.id)}
                      className="h-3 w-3 accent-sky-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggleActive(row)}
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold min-w-[52px] text-center ${
                        row.active
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {row.active ? "YES" : "NO"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.indicator_name}
                      onChange={(e) =>
                        updateField(row.id, "indicator_name", e.target.value)
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.description ?? ""}
                      onBlur={(e) =>
                        updateField(row.id, "description", e.target.value)
                      }
                      placeholder="Short description of indicator"
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.parameter_1 ?? ""}
                      onBlur={(e) =>
                        updateField(row.id, "parameter_1", parseNumber(e.target.value))
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.parameter_2 ?? ""}
                      onBlur={(e) =>
                        updateField(row.id, "parameter_2", parseNumber(e.target.value))
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.parameter_3 ?? ""}
                      onBlur={(e) =>
                        updateField(row.id, "parameter_3", parseNumber(e.target.value))
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.manual_weight ?? ""}
                      onBlur={(e) =>
                        updateField(row.id, "manual_weight", parseNumber(e.target.value))
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggleAi(row)}
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        row.use_ai_weight
                          ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {row.use_ai_weight ? "AI" : "Manual"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={row.ai_latest_weight ?? ""}
                      onBlur={(e) =>
                        updateField(
                          row.id,
                          "ai_latest_weight",
                          parseNumber(e.target.value),
                        )
                      }
                      className="h-7 bg-slate-900/70 border-slate-800 text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-slate-900 hover:bg-slate-800"
                        disabled={savingId === row.id}
                        onClick={() => handleSaveRow(row)}
                      >
                        {savingId === row.id ? (
                          <SimpleSpinner size={12} />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-300 hover:text-rose-400 hover:bg-rose-500/10"
                        disabled={deletingId === row.id}
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        {deletingId === row.id ? (
                          <SimpleSpinner size={12} />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


