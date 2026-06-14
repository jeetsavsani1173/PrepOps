"use client";

import { Opportunity, OpportunityStatus } from "@prisma/client";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { KANBAN_STATUSES } from "@/lib/constants";

type DashboardClientProps = {
  initialData: Opportunity[];
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
};

const statusLabel: Record<OpportunityStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  BETTER_LUCK_NEXT_TIME: "Better luck next time",
};

const statusMeta: Record<OpportunityStatus, { label: string; accent: string; column: string; badge: string }> = {
  SAVED: {
    label: "Saved",
    accent: "from-cyan-400 to-blue-500",
    column: "border-cyan-500/30 bg-cyan-500/[0.04]",
    badge: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
  },
  APPLIED: {
    label: "Applied",
    accent: "from-emerald-400 to-teal-500",
    column: "border-emerald-500/30 bg-emerald-500/[0.04]",
    badge: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  },
  INTERVIEW: {
    label: "OA/Interview",
    accent: "from-amber-300 to-orange-500",
    column: "border-amber-500/30 bg-amber-500/[0.04]",
    badge: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  },
  BETTER_LUCK_NEXT_TIME: {
    label: "Better luck next time",
    accent: "from-rose-400 to-red-500",
    column: "border-rose-500/30 bg-rose-500/[0.04]",
    badge: "border-rose-400/40 bg-rose-400/10 text-rose-100",
  },
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
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeData, setResumeData] = useState<{ versionName: string; skills: string[]; updatedAt: string } | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteOpportunityId, setDeleteOpportunityId] = useState<string | null>(null);
  const toastCounter = useRef(1);

  const active = opportunities.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    fetch("/api/resume/upload")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setResumeData(json.data);
        }
      })
      .catch((err) => console.error("Failed to load resume", err));
  }, []);

  async function handleResumeUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return notify("Please select a file to upload", "error");

    setUploadingResume(true);
    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        notify(json.error ?? "Failed to upload resume", "error");
      } else {
        setResumeData(json.data);
        notify("Resume parsed and saved successfully.", "success");
      }
    } catch (err) {
      notify(`Upload failed: ${err}`, "error");
    } finally {
      setUploadingResume(false);
    }
  }
  const deleteTarget = opportunities.find((item) => item.id === deleteOpportunityId) ?? null;

  const byStatus = useMemo(
    () =>
      KANBAN_STATUSES.reduce(
        (acc, status) => {
          acc[status] = opportunities.filter((item) => item.status === status);
          return acc;
        },
        {} as Record<OpportunityStatus, Opportunity[]>,
      ),
    [opportunities],
  );

  function notify(message: string, type: Toast["type"]) {
    try {
      const id = toastCounter.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2500);
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
    setSaving(true);
    const formData = new FormData(event.currentTarget);

    const res = await fetch(`/api/opportunities/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: String(formData.get("companyName") ?? ""),
        roleTitle: String(formData.get("roleTitle") ?? ""),
        jobUrl: String(formData.get("jobUrl") ?? "") || undefined,
        status: String(formData.get("status") ?? "SAVED"),
        retentionDays: Number(formData.get("retentionDays") ?? 14),
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) return notify(json.error ?? "Failed to update", "error");

    setOpportunities((prev) => prev.map((item) => (item.id === active.id ? json.data : item)));
    setActiveId(null);
    notify("Information saved successfully.", "success");
  }

  async function addOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: String(formData.get("companyName") ?? ""),
        roleTitle: String(formData.get("roleTitle") ?? ""),
        jobUrl: String(formData.get("jobUrl") ?? "") || undefined,
        source: "MANUAL",
        status: "SAVED",
        retentionDays: Number(formData.get("retentionDays") ?? 14),
      }),
    });

    const json = await res.json();
    if (!res.ok) return notify(json.error ?? "Failed to add", "error");
    if (json.ignored) return notify("This link is already saved.", "error");

    setOpportunities((prev) => [json.data, ...prev]);
    setShowAddModal(false);
    notify("Information saved successfully.", "success");
  }

  async function deleteOpportunity(id: string) {
    const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    if (!res.ok) return notify("Failed to delete", "error");

    setOpportunities((prev) => prev.filter((item) => item.id !== id));
    setActiveId(null);
    setDeleteOpportunityId(null);
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
    if (!res.ok) return notify(json.error ?? "Failed to move card", "error");

    setOpportunities((prev) => prev.map((op) => (op.id === opportunityId ? json.data : op)));
    notify("Status updated.", "success");
  }

  const total = opportunities.length;
  const applied = byStatus.APPLIED.length;
  const interviews = byStatus.INTERVIEW.length;
  const closed = byStatus.BETTER_LUCK_NEXT_TIME.length;
  const activePipeline = applied + interviews;

  return (
    <main className="relative mx-auto flex w-full max-w-[1540px] flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl backdrop-blur">
        <div className="grid gap-6 border-b border-white/10 bg-[linear-gradient(135deg,rgba(20,184,166,.14),rgba(59,130,246,.08)_42%,rgba(245,158,11,.10))] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-300/40 bg-emerald-300 text-base font-black text-zinc-950 shadow-[0_0_28px_rgba(16,185,129,.35)]">P</div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-zinc-50">PrepOps</p>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Dream Role Command Center</p>
              </div>
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-zinc-50 sm:text-4xl">
              Keep every opportunity, referral, and next move in one command view.
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/analytics" className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-5 text-sm font-bold text-zinc-100 transition hover:bg-zinc-800">
              📊 Analytics
            </Link>
            <button onClick={() => setShowResumeModal(true)} className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-5 text-sm font-bold text-zinc-100 transition hover:bg-zinc-800">
              {resumeData ? "📄 Manage Resume" : "📄 Upload Resume"}
            </button>
            <button onClick={() => setShowAddModal(true)} className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 px-5 text-sm font-bold text-zinc-950 shadow-[0_14px_34px_rgba(16,185,129,.25)] transition hover:bg-emerald-300">
              + Add Opportunity
            </button>
          </div>
        </div>

        <section className="grid gap-3 p-4 md:grid-cols-4">
          <MetricCard label="Total tracked" value={`${total}`} accent="text-cyan-100" detail="Saved in workspace" />
          <MetricCard label="Active pipeline" value={`${activePipeline}`} accent="text-emerald-100" detail="Applied or interviewing" />
          <MetricCard label="OA/Interview" value={`${interviews}`} accent="text-amber-100" detail="Needs preparation" />
          <MetricCard label="Closed" value={`${closed}`} accent="text-rose-100" detail="Archived outcome" />
        </section>
      </header>

      <form onSubmit={runSearch} className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3 shadow-xl backdrop-blur md:grid-cols-[1fr_210px_auto]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, role, or job link" className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-cyan-300" />
        <select value={period} onChange={async (e) => { const next = e.target.value as (typeof periodOptions)[number]["value"]; setPeriod(next); await loadOpportunities(query, next); }} className="h-11 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 text-sm text-zinc-200 transition focus:border-cyan-300">
          {periodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button className="h-11 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200">Search</button>
      </form>

      <section className="grid gap-4 lg:grid-cols-4">
        {KANBAN_STATUSES.map((status) => (
          <div key={status} onDragOver={(e) => e.preventDefault()} onDrop={async () => { if (draggingId) { await moveStatus(draggingId, status); setDraggingId(null); } }} className={`min-h-[420px] rounded-2xl border bg-zinc-950/65 p-3 shadow-xl backdrop-blur ${statusMeta[status].column}`}>
            <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/70">
              <div className={`h-1 bg-gradient-to-r ${statusMeta[status].accent}`} />
              <div className="flex items-center justify-between px-3 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">{statusLabel[status]}</h2>
                  <p className="text-[11px] text-zinc-500">{statusMeta[status].label}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta[status].badge}`}>{byStatus[status].length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {byStatus[status].map((item) => (
                <button key={item.id} draggable onDragStart={() => setDraggingId(item.id)} onClick={() => setActiveId(item.id)} className="group w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900/85 text-left shadow-[0_10px_30px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-zinc-900">
                  <div className={`h-1 bg-gradient-to-r ${statusMeta[item.status].accent}`} />
                  <div className="p-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">{item.roleTitle}</p>
                        <p className="mt-1 text-xs text-zinc-400">{item.companyName}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">{item.retentionDays}d</span>
                    </div>
                    <p className="truncate rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 text-[11px] text-zinc-500">{item.jobUrl ?? "No URL saved"}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{formatShortDate(item.createdAt)}</span>
                      <span className="text-cyan-200 opacity-0 transition group-hover:opacity-100">Open</span>
                    </div>
                  </div>
                </button>
              ))}
              {byStatus[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/50 p-4 text-center text-sm text-zinc-500">
                  Drop opportunities here
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {active && (
        <Modal title="Quick Edit" onClose={() => setActiveId(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Company name" name="companyName" defaultValue={active.companyName} />
            <Field label="Role title" name="roleTitle" defaultValue={active.roleTitle} />
            <Field label="Job link" name="jobUrl" defaultValue={active.jobUrl ?? ""} />
            <label className="block text-xs text-zinc-400">Status
              <select name="status" defaultValue={active.status} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100">
                {KANBAN_STATUSES.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">Retention days
              <input type="number" min={1} max={365} name="retentionDays" defaultValue={active.retentionDays} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Link href={`/opportunities/${active.id}`} className="rounded-xl bg-indigo-500 px-3 py-2 text-center text-sm font-medium text-white">Open Details</Link>
              {active.jobUrl ? (
                <a href={active.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                  <ExternalIcon /> Apply Link
                </a>
              ) : (
                <span className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-center text-sm text-zinc-500">No Link</span>
              )}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteOpportunityId(active.id)} className="w-full rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white">Delete</button>
              <button disabled={saving} className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete opportunity?"
          body={`This will permanently remove ${deleteTarget.roleTitle} at ${deleteTarget.companyName}.`}
          confirmLabel="Delete opportunity"
          onCancel={() => setDeleteOpportunityId(null)}
          onConfirm={() => deleteOpportunity(deleteTarget.id)}
        />
      )}

      {showAddModal && (
        <Modal title="Add Opportunity" onClose={() => setShowAddModal(false)}>
          <form onSubmit={addOpportunity} className="space-y-3">
            <Field label="Company name" name="companyName" defaultValue="" />
            <Field label="Role title" name="roleTitle" defaultValue="" />
            <Field label="Job link" name="jobUrl" defaultValue="" />
            <label className="block text-xs text-zinc-400">Retention days
              <input type="number" min={1} max={365} name="retentionDays" defaultValue="14" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100" />
            </label>
            <button className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-900">Save Opportunity</button>
          </form>
        </Modal>
      )}

      {showResumeModal && (
        <Modal title="Manage Resume" onClose={() => setShowResumeModal(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Current Resume</h4>
              {resumeData ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-100 truncate max-w-[220px]" title={resumeData.versionName}>
                      {resumeData.versionName}
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      Updated {formatShortDate(resumeData.updatedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Skills parsed from resume:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {resumeData.skills.length > 0 ? (
                      resumeData.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] text-indigo-300">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No skills extracted</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400 italic">No resume uploaded yet.</p>
              )}
            </div>

            <form onSubmit={handleResumeUpload} className="space-y-3">
              <label className="block text-xs text-zinc-400">
                Upload New Resume (PDF only)
                <input
                  required
                  type="file"
                  name="file"
                  accept=".pdf,application/pdf"
                  className="mt-1 block w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-zinc-700 file:bg-zinc-900 file:text-xs file:font-semibold file:text-zinc-200 hover:file:bg-zinc-800"
                />
              </label>
              <button
                disabled={uploadingResume}
                className="w-full rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {uploadingResume ? "Uploading & Parsing..." : "Upload & Parse"}
              </button>
            </form>
          </div>
        </Modal>
      )}

      <div className="fixed bottom-4 right-4 z-[60] flex w-[350px] flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          let borderClass = "";
          let bgClass = "";
          let icon = null;

          if (toast.type === "success") {
            borderClass = "border-emerald-500/30";
            bgClass = "bg-zinc-900/95 backdrop-blur-md";
            icon = (
              <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            );
          } else if (toast.type === "warning") {
            borderClass = "border-amber-500/30";
            bgClass = "bg-zinc-900/95 backdrop-blur-md";
            icon = (
              <svg className="h-4 w-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            );
          } else {
            borderClass = "border-rose-500/30";
            bgClass = "bg-zinc-900/95 backdrop-blur-md";
            icon = (
              <svg className="h-4 w-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            );
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${borderClass} ${bgClass} p-4 shadow-xl transition-all duration-300 transform translate-y-0 animate-slide-in`}
              style={{
                boxShadow: "0 8px 30px rgb(0 0 0 / 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
              }}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 text-sm font-medium text-zinc-200">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 4H20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14V20H4V4H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <input required={name !== "jobUrl"} name={name} defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 text-sm text-zinc-100 transition focus:border-cyan-300" />
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="border-b border-white/10 bg-zinc-900/80 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            <button onClick={onClose} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100">Close</button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{body}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, accent = "text-zinc-100" }: { label: string; value: string; detail: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/65 p-4 shadow-[0_12px_36px_rgba(0,0,0,.18)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function formatShortDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
