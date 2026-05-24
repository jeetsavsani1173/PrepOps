"use client";

import { Opportunity, OpportunityStatus } from "@prisma/client";
import { FormEvent, useMemo, useRef, useState } from "react";
import { KANBAN_STATUSES } from "@/lib/constants";

type DashboardClientProps = {
  initialData: Opportunity[];
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

const statusLabel: Record<OpportunityStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  BETTER_LUCK_NEXT_TIME: "Better luck next time",
};

const periodOptions = [
  { value: "1d", label: "Past 1 day" },
  { value: "1w", label: "Past 1 week" },
  { value: "1m", label: "Past 1 month" },
  { value: "1y", label: "Past 1 year" },
] as const;

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [opportunities, setOpportunities] = useState(initialData);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("1m");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(1);

  const active = opportunities.find((item) => item.id === activeId) ?? null;

  const byStatus = useMemo(() => {
    return KANBAN_STATUSES.reduce(
      (acc, status) => {
        acc[status] = opportunities.filter((item) => item.status === status);
        return acc;
      },
      {} as Record<OpportunityStatus, Opportunity[]>,
    );
  }, [opportunities]);

  const total = opportunities.length;
  const applied = byStatus.APPLIED.length;
  const interviews = byStatus.INTERVIEW.length;
  const closed = byStatus.BETTER_LUCK_NEXT_TIME.length;

  function notify(message: string, type: Toast["type"]) {
    try {
      const id = toastCounter.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2800);
    } catch {
      window.alert(message);
    }
  }

  async function loadOpportunities(nextQuery = query, nextPeriod = period) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    params.set("period", nextPeriod);

    const res = await fetch(`/api/opportunities?${params.toString()}`);
    const json = await res.json();
    setOpportunities(json.data ?? []);
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    await loadOpportunities(query, period);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);

    const payload = {
      companyName: String(formData.get("companyName") ?? ""),
      roleTitle: String(formData.get("roleTitle") ?? ""),
      jobUrl: String(formData.get("jobUrl") ?? "") || undefined,
      status: String(formData.get("status") ?? "SAVED"),
      retentionDays: Number(formData.get("retentionDays") ?? 14),
    };

    const res = await fetch(`/api/opportunities/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      notify(json.error ?? "Failed to update", "error");
      return;
    }

    setOpportunities((prev) => prev.map((item) => (item.id === active.id ? json.data : item)));
    setActiveId(null);
    notify("Information saved successfully.", "success");
  }

  async function addOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      companyName: String(formData.get("companyName") ?? ""),
      roleTitle: String(formData.get("roleTitle") ?? ""),
      jobUrl: String(formData.get("jobUrl") ?? "") || undefined,
      source: "MANUAL",
      status: "SAVED",
      retentionDays: Number(formData.get("retentionDays") ?? 14),
    };

    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      notify(json.error ?? "Failed to add opportunity", "error");
      return;
    }

    if (json.ignored) {
      notify("This job link already exists, so it was ignored.", "error");
      return;
    }

    setOpportunities((prev) => [json.data, ...prev]);
    setShowAddModal(false);
    notify("Information saved successfully.", "success");
  }

  async function deleteOpportunity(id: string) {
    const ok = window.confirm("Delete this opportunity?");
    if (!ok) return;

    const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      notify("Failed to delete opportunity", "error");
      return;
    }

    setOpportunities((prev) => prev.filter((item) => item.id !== id));
    setActiveId(null);
    notify("Opportunity deleted successfully.", "success");
  }

  async function moveStatus(opportunityId: string, toStatus: OpportunityStatus) {
    const item = opportunities.find((op) => op.id === opportunityId);
    if (!item || item.status === toStatus) return;

    const res = await fetch(`/api/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    });
    const json = await res.json();

    if (!res.ok) {
      notify(json.error ?? "Failed to move card", "error");
      return;
    }

    setOpportunities((prev) => prev.map((op) => (op.id === opportunityId ? json.data : op)));
    notify("Status updated.", "success");
  }

  return (
    <main className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.22),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,.18),transparent_40%)]" />

      <header className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/75 px-5 py-4 shadow-[0_0_50px_rgba(0,0,0,.25)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-indigo-500 text-sm font-black text-zinc-950 shadow-lg shadow-indigo-900/40">
            P
          </div>
          <p className="text-xl font-semibold tracking-tight text-zinc-100">PrepOps</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          + Add Opportunity
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total" value={`${total}`} />
        <MetricCard label="Applied" value={`${applied}`} />
        <MetricCard label="Interviews" value={`${interviews}`} />
        <MetricCard label="Better Luck" value={`${closed}`} accent="text-rose-300" />
      </section>

      <form onSubmit={runSearch} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/65 p-3 md:grid-cols-[1fr_200px_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company or link"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <select
          value={period}
          onChange={async (e) => {
            const next = e.target.value as (typeof periodOptions)[number]["value"];
            setPeriod(next);
            await loadOpportunities(query, next);
          }}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-400"
        >
          {periodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400">
          Search
        </button>
      </form>

      <section className="grid gap-4 lg:grid-cols-4">
        {KANBAN_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async () => {
              if (draggingId) {
                await moveStatus(draggingId, status);
                setDraggingId(null);
              }
            }}
            className="min-h-[360px] rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">{statusLabel[status]}</h2>
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">{byStatus[status].length}</span>
            </div>
            <div className="space-y-2">
              {byStatus[status].map((item) => (
                <button
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onClick={() => setActiveId(item.id)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/60"
                >
                  <p className="text-sm font-medium text-zinc-100">{item.roleTitle}</p>
                  <p className="text-xs text-zinc-400">{item.companyName}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-500">{item.jobUrl ?? "No URL"}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {active && (
        <Modal title="Opportunity Editor" onClose={() => setActiveId(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Company name" name="companyName" defaultValue={active.companyName} />
            <Field label="Role title" name="roleTitle" defaultValue={active.roleTitle} />
            <Field label="Job link" name="jobUrl" defaultValue={active.jobUrl ?? ""} />
            <label className="block text-xs text-zinc-400">
              Status
              <select
                name="status"
                defaultValue={active.status}
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              >
                {KANBAN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              Retention days
              <input
                type="number"
                min={1}
                max={365}
                name="retentionDays"
                defaultValue={active.retentionDays}
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteOpportunity(active.id)}
                className="w-full rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showAddModal && (
        <Modal title="Add Opportunity" onClose={() => setShowAddModal(false)}>
          <form onSubmit={addOpportunity} className="space-y-3">
            <Field label="Company name" name="companyName" defaultValue="" />
            <Field label="Role title" name="roleTitle" defaultValue="" />
            <Field label="Job link" name="jobUrl" defaultValue="" />
            <label className="block text-xs text-zinc-400">
              Retention days
              <input
                type="number"
                min={1}
                max={365}
                name="retentionDays"
                defaultValue="14"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <button className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-900">
              Save Opportunity
            </button>
          </form>
        </Modal>
      )}

      <div className="fixed bottom-4 right-4 z-[60] flex w-[320px] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-3 py-2 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-500/60 bg-emerald-950/70 text-emerald-100"
                : "border-rose-500/60 bg-rose-950/70 text-rose-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <input
        required={name !== "jobUrl"}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "text-zinc-100",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
      <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
