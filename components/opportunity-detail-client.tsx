"use client";

import {
  Opportunity,
  ReferralChannel,
  ReferralFollowUp,
  ReferralRequest,
  ReferralStatus,
  StatusHistory,
} from "@prisma/client";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KANBAN_STATUSES } from "@/lib/constants";

type ReferralWithFollowUps = ReferralRequest & { followUps: ReferralFollowUp[] };
type OpportunityWithReferrals = Opportunity & {
  referralRequests?: ReferralWithFollowUps[];
  statusHistory?: StatusHistory[];
};
type Props = {
  initial: OpportunityWithReferrals;
  referralTrackingEnabled: boolean;
};
type DetailTab = "overview" | "requirements" | "compensation" | "followUps" | "timeline" | "raw";

const tabs: Array<{ id: DetailTab; label: string; referralOnly?: boolean }> = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "compensation", label: "Compensation" },
  { id: "followUps", label: "Follow-ups", referralOnly: true },
  { id: "timeline", label: "Timeline" },
  { id: "raw", label: "Raw Extract" },
];

const referralChannels: ReferralChannel[] = ["LINKEDIN", "EMAIL", "OTHER"];
const referralStatuses: ReferralStatus[] = [
  "PLANNED",
  "REQUESTED",
  "FOLLOWED_UP",
  "RESPONDED",
  "REFERRED",
  "DECLINED",
  "CLOSED",
];

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
};

export function OpportunityDetailClient({ initial, referralTrackingEnabled }: Props) {
  const [opportunity, setOpportunity] = useState(initial);
  const [referrals, setReferrals] = useState<ReferralWithFollowUps[]>(initial.referralRequests ?? []);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [savingReferral, setSavingReferral] = useState(false);
  const [copiedReferralId, setCopiedReferralId] = useState<string>("");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [copiedSkill, setCopiedSkill] = useState<string>("");
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(1);

  function notify(message: string, type: Toast["type"]) {
    try {
      const id = toastCounter.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
    } catch {
      window.alert(message);
    }
  }

  const requiredSkills = useMemo(() => splitSkills(opportunity.requiredSkills), [opportunity.requiredSkills]);
  const preferredSkills = useMemo(() => splitSkills(opportunity.preferredSkills), [opportunity.preferredSkills]);
  const sourceMode = extractSourceMode(opportunity.aiRecommendationReason);

  async function saveBasics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: String(formData.get("companyName") ?? ""),
        roleTitle: String(formData.get("roleTitle") ?? ""),
        jobUrl: String(formData.get("jobUrl") ?? "") || undefined,
        location: String(formData.get("location") ?? "") || undefined,
        status: String(formData.get("status") ?? "SAVED"),
        retentionDays: Number(formData.get("retentionDays") ?? 14),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return notify(json.error ?? "Failed to save", "error");
    setOpportunity(json.data);
    notify("Changes saved successfully.", "success");
  }

  async function analyze() {
    if (!opportunity.jobUrl) return notify("Add a valid job URL first.", "warning");
    setAnalyzing(true);
    const res = await fetch("/api/scrape-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: opportunity.jobUrl, opportunityId: opportunity.id }),
    });
    const json = await res.json();
    setAnalyzing(false);
    if (!res.ok) return notify(json.error ?? "Analysis failed", "error");

    const refreshed = await fetch(`/api/opportunities/${opportunity.id}`);
    const refreshedJson = await refreshed.json();
    if (refreshed.ok) {
      setOpportunity(refreshedJson.data);
      notify("Job description scraped successfully.", "success");
    }
  }

  async function runAiAnalysis() {
    setRunningAi(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/analyze`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        const isConfigError = 
          json.error?.includes("GEMINI_API_KEY") || 
          json.error?.includes("AI features are disabled") || 
          json.error?.includes("quota exceeded") ||
          json.error?.includes("Quota exceeded") ||
          res.status === 429 ||
          res.status === 403 ||
          json.detail?.includes("GEMINI_API_KEY");
        if (isConfigError) {
          notify(json.error ?? "API Key not provided. Set GEMINI_API_KEY in your .env file.", "warning");
        } else {
          notify(json.error ?? "AI Analysis failed", "error");
        }
      } else {
        setOpportunity(json.data);
        notify("AI analysis complete! Match score and recommendations have been updated.", "success");
      }
    } catch (err) {
      notify(`AI Analysis failed: ${err}`, "error");
    } finally {
      setRunningAi(false);
    }
  }

  async function generateReferralMessage(referralId: string) {
    setGeneratingMessageId(referralId);
    try {
      const res = await fetch("/api/ai/referral-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id, referralId }),
      });
      const json = await res.json();
      if (!res.ok) {
        const isConfigError = 
          json.error?.includes("GEMINI_API_KEY") || 
          json.error?.includes("AI features are disabled") || 
          json.error?.includes("quota exceeded") ||
          json.error?.includes("Quota exceeded") ||
          res.status === 429 ||
          res.status === 403 ||
          json.detail?.includes("GEMINI_API_KEY");
        if (isConfigError) {
          notify(json.error ?? "API Key not provided. Set GEMINI_API_KEY in your .env file.", "warning");
        } else {
          notify(json.error ?? "Failed to generate message", "error");
        }
      } else {
        setReferrals((prev) =>
          prev.map((item) => (item.id === referralId ? json.data : item))
        );
        notify("AI Referral Message generated and saved!", "success");
      }
    } catch (err) {
      notify(`Generation failed: ${err}`, "error");
    } finally {
      setGeneratingMessageId(null);
    }
  }

  async function copySkill(skill: string) {
    try {
      await navigator.clipboard.writeText(skill);
      setCopiedSkill(skill);
      setTimeout(() => setCopiedSkill(""), 1200);
      notify(`Copied skill to clipboard: ${skill}`, "success");
    } catch {
      notify(`Copy failed: ${skill}`, "error");
    }
  }

  async function createReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingReferral(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const res = await fetch(`/api/opportunities/${opportunity.id}/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: String(formData.get("contactName") ?? ""),
        contactTitle: String(formData.get("contactTitle") ?? "") || undefined,
        contactCompany: String(formData.get("contactCompany") ?? "") || undefined,
        contactUrl: String(formData.get("contactUrl") ?? "") || undefined,
        contactEmail: String(formData.get("contactEmail") ?? "") || undefined,
        channel: String(formData.get("channel") ?? "LINKEDIN"),
        status: String(formData.get("status") ?? "PLANNED"),
        initialMessage: String(formData.get("initialMessage") ?? "") || undefined,
        nextFollowUpAt: String(formData.get("nextFollowUpAt") ?? "") || undefined,
        notes: String(formData.get("notes") ?? "") || undefined,
      }),
    });
    const json = await res.json();
    setSavingReferral(false);
    if (!res.ok) return notify(json.error ?? "Failed to create referral", "error");
    setReferrals((prev) => [json.data, ...prev]);
    notify("Referral request created.", "success");
    form.reset();
  }

  async function updateReferral(id: string, payload: Partial<ReferralRequest>) {
    const res = await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return notify(json.error ?? "Failed to update referral", "error");
    setReferrals((prev) => prev.map((item) => (item.id === id ? json.data : item)));
    notify("Referral updated.", "success");
  }

  async function deleteReferral(id: string) {
    const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
    if (!res.ok) return notify("Failed to delete referral", "error");
    setReferrals((prev) => prev.filter((item) => item.id !== id));
    notify("Referral deleted.", "success");
    setDeleteReferralId(null);
  }

  async function addFollowUp(event: FormEvent<HTMLFormElement>, referralId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const res = await fetch(`/api/referrals/${referralId}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(formData.get("message") ?? ""),
        sentAt: String(formData.get("sentAt") ?? "") || undefined,
        nextFollowUpAt: String(formData.get("nextFollowUpAt") ?? "") || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) return notify(json.error ?? "Failed to add follow-up", "error");
    setReferrals((prev) => prev.map((item) => (item.id === referralId ? json.data : item)));
    notify("Follow-up added.", "success");
    form.reset();
  }

  async function copyReferralMessage(referral: ReferralWithFollowUps, mode: "initial" | "follow-up") {
    const message =
      mode === "initial"
        ? referral.initialMessage || buildReferralRequestMessage(opportunity, referral)
        : buildReferralFollowUpMessage(opportunity, referral);

    try {
      await navigator.clipboard.writeText(message);
      setCopiedReferralId(`${referral.id}-${mode}`);
      setTimeout(() => setCopiedReferralId(""), 1200);
      notify("Message copied to clipboard.", "success");
    } catch {
      notify("Copy failed.", "error");
    }
  }

  const markdownView = buildMarkdown(opportunity);
  const visibleTabs = tabs.filter((item) => !item.referralOnly || referralTrackingEnabled);
  const referralToDelete = referrals.find((item) => item.id === deleteReferralId) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-4 sm:p-6">
      <header className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/75 shadow-2xl backdrop-blur">
        <div className="border-b border-white/10 bg-zinc-950/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 transition hover:border-cyan-300/70 hover:bg-zinc-800">
              <BackIcon /> Back to dashboard
            </Link>
            {opportunity.jobUrl && (
              <a href={opportunity.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">
                <ExternalIcon /> Apply
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-5 bg-[linear-gradient(135deg,rgba(20,184,166,.12),rgba(59,130,246,.07)_45%,rgba(245,158,11,.10))] px-4 py-6 sm:px-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">Opportunity Detail</span>
              <span>{opportunity.companyName}</span>
            </div>
            <h1 className="max-w-4xl text-2xl font-semibold leading-tight text-zinc-100 sm:text-3xl">{opportunity.roleTitle}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <HeaderPill label="Status" value={formatEnum(opportunity.status)} accent="border-indigo-500/40 bg-indigo-500/10 text-indigo-100" />
              {hasValue(opportunity.location) && <HeaderPill label="Location" value={opportunity.location ?? ""} />}
              {typeof opportunity.aiMatchScore === "number" && <HeaderPill label="Match" value={`${opportunity.aiMatchScore}/100`} accent="border-emerald-500/40 bg-emerald-500/10 text-emerald-100" />}
              {opportunity.applicationDecision && <HeaderPill label="Decision" value={opportunity.applicationDecision} />}
            </div>
          </div>
          {opportunity.jobUrl ? (
            <a href={opportunity.jobUrl} target="_blank" rel="noopener noreferrer" className="hidden items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:border-emerald-400 lg:inline-flex">
              Open job post <ExternalIcon />
            </a>
          ) : (
            <div className="hidden rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500 lg:block">
              No job link saved
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Editable profile</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-100">Core Details</h2>
            </div>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">{formatEnum(opportunity.source)}</span>
          </div>
          <form onSubmit={saveBasics} className="space-y-3">
            <Field label="Company" name="companyName" value={opportunity.companyName} />
            <Field label="Role" name="roleTitle" value={opportunity.roleTitle} />
            <Field label="Job URL" name="jobUrl" value={opportunity.jobUrl ?? ""} />
            <Field label="Location" name="location" value={opportunity.location ?? ""} />

            <label className="block text-xs text-zinc-400">Status
              <select name="status" defaultValue={opportunity.status} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100">
                {KANBAN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label className="block text-xs text-zinc-400">Retention days
              <input name="retentionDays" type="number" min={1} max={365} defaultValue={opportunity.retentionDays} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100" />
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={analyze} className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300 disabled:opacity-50" disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze Job"}
              </button>
              <button className="w-full rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-xl backdrop-blur">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">AI signal</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100">Decision Card</h2>
          </div>
          {typeof opportunity.aiMatchScore === "number" && (
            <div className="mb-4 rounded-xl border border-white/10 bg-zinc-900/80 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Match Score</span>
                <span className="font-semibold text-zinc-100">{opportunity.aiMatchScore}/100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${scoreBarClass(opportunity.aiMatchScore)}`}
                  style={{ width: `${Math.max(0, Math.min(100, opportunity.aiMatchScore))}%` }}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {opportunity.applicationDecision && <Info label="Decision" value={opportunity.applicationDecision} />}
            {opportunity.prepDifficulty && <Info label="Prep Difficulty" value={opportunity.prepDifficulty} />}
            {sourceMode !== "Not available" && <Info label="Source Mode" value={sourceMode} />}
            {hasValue(opportunity.workModel) && <Info label="Work Model" value={opportunity.workModel ?? ""} />}
            {hasValue(opportunity.location) && <Info label="Location" value={opportunity.location ?? ""} />}
            {hasValue(opportunity.experienceLevel) && <Info label="Experience" value={opportunity.experienceLevel ?? ""} />}
          </div>
          {hasValue(opportunity.aiRecommendationReason) && (
            <p className="mt-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-xs leading-5 text-zinc-300">
              {opportunity.aiRecommendationReason}
            </p>
          )}
          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={runningAi}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-50"
          >
            {runningAi ? "Computing AI Match..." : "✨ Run AI Match Score"}
          </button>
        </article>
      </section>

      {referralTrackingEnabled && (
        <ReferralTracker
          companyName={opportunity.companyName}
          roleTitle={opportunity.roleTitle}
          referrals={referrals}
          savingReferral={savingReferral}
          copiedReferralId={copiedReferralId}
          onCreate={createReferral}
          onUpdate={updateReferral}
          onDelete={setDeleteReferralId}
          onAddFollowUp={addFollowUp}
          onCopyMessage={copyReferralMessage}
          onGenerateReferralMessage={generateReferralMessage}
          generatingMessageId={generatingMessageId}
        />
      )}

      <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-xl backdrop-blur">
        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-zinc-900/60 p-1.5">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                tab === t.id ? "bg-cyan-300 text-zinc-950 shadow-lg" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {hasValue(opportunity.workModel) && <DataCard title="Work Model" value={opportunity.workModel} />}
            {hasValue(opportunity.employmentType) && <DataCard title="Employment Type" value={opportunity.employmentType} />}
            {hasValue(opportunity.location) && <DataCard title="Location" value={opportunity.location} />}
            {hasValue(opportunity.experienceLevel) && <DataCard title="Experience" value={opportunity.experienceLevel} />}
            {hasValue(opportunity.salary) && <DataCard title="Compensation" value={opportunity.salary} />}
            {opportunity.applicationDecision && <DataCard title="Recommendation" value={opportunity.applicationDecision} />}
          </div>
        )}

        {tab === "requirements" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {requiredSkills.length > 0 && (
              <SkillCard title="Required Skills" skills={requiredSkills} copiedSkill={copiedSkill} onCopy={copySkill} />
            )}
            {preferredSkills.length > 0 && (
              <SkillCard title="Preferred Skills" skills={preferredSkills} copiedSkill={copiedSkill} onCopy={copySkill} />
            )}
            {hasValue(opportunity.responsibilities) && (
              <MarkdownDataCard
                title="Responsibilities"
                markdown={toStrictBulletMarkdown(opportunity.responsibilities ?? "")}
                large
              />
            )}
            {hasValue(opportunity.qualifications) && (
              <MarkdownDataCard
                title="Qualifications"
                markdown={toStrictBulletMarkdown(opportunity.qualifications ?? "")}
                large
              />
            )}
          </div>
        )}

        {tab === "compensation" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {hasValue(opportunity.salary) && <DataCard title="Salary" value={opportunity.salary} />}
            {hasValue(opportunity.experienceLevel) && <DataCard title="Experience Level" value={opportunity.experienceLevel} />}
            {hasValue(opportunity.employmentType) && <DataCard title="Employment Type" value={opportunity.employmentType} />}
            {hasValue(opportunity.workModel) && <DataCard title="Work Model" value={opportunity.workModel} />}
            {hasValue(opportunity.location) && <DataCard title="Location" value={opportunity.location} />}
          </div>
        )}

        {tab === "followUps" && referralTrackingEnabled && (
          <FollowUpCenter referrals={referrals} />
        )}

        {tab === "timeline" && (
          <TimelineView
            createdAt={opportunity.createdAt}
            statusHistory={opportunity.statusHistory ?? []}
          />
        )}

        {tab === "raw" && (
          hasMeaningfulRaw(opportunity) ? (
            <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-headings:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownView}</ReactMarkdown>
            </article>
          ) : null
        )}
      </section>

      {referralToDelete && (
        <ConfirmModal
          title="Delete referral?"
          body={`This will remove ${referralToDelete.contactName}'s referral request and its follow-up history.`}
          confirmLabel="Delete referral"
          onCancel={() => setDeleteReferralId(null)}
          onConfirm={() => deleteReferral(referralToDelete.id)}
        />
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

function buildMarkdown(op: Opportunity): string {
  const sections: string[] = [`# ${op.roleTitle || "Unknown Role"}`];
  const sourceMode = extractSourceMode(op.aiRecommendationReason);
  const push = (title: string, value: string) => {
    if (!value.trim()) return;
    sections.push(`## ${title}\n${value}`);
  };

  push("Company", op.companyName || "");
  push("Job URL", op.jobUrl || "");
  push("Location", hasValue(op.location) ? op.location ?? "" : "");
  push("Work Model", hasValue(op.workModel) ? op.workModel ?? "" : "");
  push("Employment Type", hasValue(op.employmentType) ? op.employmentType ?? "" : "");
  push("Experience", hasValue(op.experienceLevel) ? op.experienceLevel ?? "" : "");
  push("Compensation", hasValue(op.salary) ? op.salary ?? "" : "");
  push("Required Skills", asBulletMarkdown(op.requiredSkills));
  push("Preferred Skills", asBulletMarkdown(op.preferredSkills));
  push("Responsibilities", asParagraphOrBullet(op.responsibilities));
  push("Qualifications", asParagraphOrBullet(op.qualifications));

  const recommendation = [
    op.applicationDecision ? `- Decision: ${op.applicationDecision}` : "",
    typeof op.aiMatchScore === "number" ? `- Match Score: ${op.aiMatchScore}` : "",
    op.prepDifficulty ? `- Prep Difficulty: ${op.prepDifficulty}` : "",
    sourceMode !== "Not available" ? `- Source Mode: ${sourceMode}` : "",
    hasValue(op.aiRecommendationReason) ? `- Reason: ${op.aiRecommendationReason}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  push("Recommendation", recommendation);

  if (hasValue(op.scrapedRawText)) {
    push("Raw Scraped Data", `\`\`\`text\n${op.scrapedRawText}\n\`\`\``);
  }

  return sections.join("\n\n");
}

function ReferralTracker({
  companyName,
  roleTitle,
  referrals,
  savingReferral,
  copiedReferralId,
  onCreate,
  onUpdate,
  onDelete,
  onAddFollowUp,
  onCopyMessage,
  onGenerateReferralMessage,
  generatingMessageId,
}: {
  companyName: string;
  roleTitle: string;
  referrals: ReferralWithFollowUps[];
  savingReferral: boolean;
  copiedReferralId: string;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (id: string, payload: Partial<ReferralRequest>) => void;
  onDelete: (id: string) => void;
  onAddFollowUp: (event: FormEvent<HTMLFormElement>, referralId: string) => void;
  onCopyMessage: (referral: ReferralWithFollowUps, mode: "initial" | "follow-up") => void;
  onGenerateReferralMessage: (referralId: string) => void;
  generatingMessageId: string | null;
}) {
  const openCount = referrals.filter((referral) => !["REFERRED", "DECLINED", "CLOSED"].includes(referral.status)).length;
  const dueCount = referrals.filter((referral) => isDue(referral.nextFollowUpAt)).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-xl backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Referral workspace</p>
          <h2 className="text-base font-semibold text-zinc-100">{roleTitle} at {companyName}</h2>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{referrals.length} total</span>
          <span className="rounded-full border border-indigo-500/50 bg-indigo-500/10 px-3 py-1 text-indigo-200">{openCount} open</span>
          <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-200">{dueCount} due</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-100">Add Referral Ask</h3>
          <Field label="Person name" name="contactName" value="" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" name="contactTitle" value="" />
            <Field label="Company" name="contactCompany" value={companyName} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-400">
              Channel
              <select name="channel" defaultValue="LINKEDIN" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100">
                {referralChannels.map((channel) => <option key={channel} value={channel}>{formatEnum(channel)}</option>)}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              Status
              <select name="status" defaultValue="PLANNED" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100">
                {referralStatuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
              </select>
            </label>
          </div>
          <Field label="LinkedIn URL" name="contactUrl" value="" />
          <Field label="Email" name="contactEmail" value="" />
          <DatePickerField label="Next follow-up" name="nextFollowUpAt" />
          <Textarea label="Initial message" name="initialMessage" rows={4} />
          <Textarea label="Notes" name="notes" rows={3} />
          <button className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950" disabled={savingReferral}>
            {savingReferral ? "Saving..." : "Save Referral Ask"}
          </button>
        </form>

        <div className="space-y-3">
          {referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              No referrals yet. Add one person you plan to contact for this opportunity.
            </div>
          ) : (
            referrals.map((referral) => (
              <article key={referral.id} className="rounded-xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{referral.contactName}</h3>
                    <p className="text-xs text-zinc-400">
                      {[referral.contactTitle, referral.contactCompany].filter(Boolean).join(" · ") || "Contact details pending"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {referral.contactUrl && (
                      <a href={referral.contactUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200">LinkedIn</a>
                    )}
                    {referral.contactEmail && (
                      <a href={`mailto:${referral.contactEmail}`} className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200">Email</a>
                    )}
                    <button type="button" onClick={() => onDelete(referral.id)} className="rounded-xl border border-rose-700/70 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 transition hover:border-rose-400">Delete</button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block text-xs text-zinc-400">
                    Status
                    <select
                      value={referral.status}
                      onChange={(event) => onUpdate(referral.id, { status: event.target.value as ReferralStatus })}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
                    >
                      {referralStatuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
                    </select>
                  </label>
                  <div className="md:col-span-2">
                    <DatePickerField
                      label="Next follow-up"
                      defaultValue={formatDateTimeLocal(referral.nextFollowUpAt)}
                      compact
                      onCommit={(value) => onUpdate(referral.id, { nextFollowUpAt: value ? new Date(value) : null })}
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <MessagePanel
                    title="Referral Ask"
                    message={referral.initialMessage || buildReferralRequestMessage({ companyName, roleTitle }, referral)}
                    copied={copiedReferralId === `${referral.id}-initial`}
                    onCopy={() => onCopyMessage(referral, "initial")}
                    onGenerateAi={() => onGenerateReferralMessage(referral.id)}
                    generating={generatingMessageId === referral.id}
                  />
                  <MessagePanel
                    title="Follow-up"
                    message={buildReferralFollowUpMessage({ companyName, roleTitle }, referral)}
                    copied={copiedReferralId === `${referral.id}-follow-up`}
                    onCopy={() => onCopyMessage(referral, "follow-up")}
                  />
                </div>

                <form onSubmit={(event) => onAddFollowUp(event, referral.id)} className="mt-3 grid gap-2 lg:grid-cols-[1fr_220px_220px_auto]">
                  <input name="message" placeholder="Log follow-up message" className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
                  <DatePickerField label="Sent" name="sentAt" compact />
                  <DatePickerField label="Next" name="nextFollowUpAt" compact />
                  <button className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200">Log</button>
                </form>

                <div className="mt-3 grid gap-2 text-xs text-zinc-400 md:grid-cols-2">
                  <Info label="Channel" value={formatEnum(referral.channel)} />
                  <Info label="Next Follow-up" value={formatDisplayDate(referral.nextFollowUpAt)} />
                </div>
                {referral.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">{referral.notes}</p>}
                {referral.followUps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-zinc-300">Follow-up History</p>
                    {referral.followUps.map((followUp) => (
                      <div key={followUp.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
                        <p className="whitespace-pre-wrap">{followUp.message}</p>
                        <p className="mt-2 text-zinc-500">
                          Sent {formatDisplayDate(followUp.sentAt)}
                          {followUp.nextFollowUpAt ? ` · next ${formatDisplayDate(followUp.nextFollowUpAt)}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MessagePanel({
  title,
  message,
  copied,
  onCopy,
  onGenerateAi,
  generating = false,
}: {
  title: string;
  message: string;
  copied: boolean;
  onCopy: () => void;
  onGenerateAi?: () => void;
  generating?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/75 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-300">{title}</p>
        <div className="flex gap-2">
          {onGenerateAi && (
            <button
              type="button"
              onClick={onGenerateAi}
              disabled={generating}
              className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-50 animate-pulse"
            >
              {generating ? "Generating..." : "✨ AI Draft"}
            </button>
          )}
          <button type="button" onClick={onCopy} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:border-cyan-300 hover:text-cyan-100">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-xs text-zinc-400">{message}</p>
    </div>
  );
}

function DatePickerField({
  label,
  name,
  defaultValue = "",
  compact = false,
  onCommit,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  compact?: boolean;
  onCommit?: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const resetValue = () => {
      window.setTimeout(() => {
        setValue(defaultValue);
        if (inputRef.current) inputRef.current.value = defaultValue;
      }, 0);
    };
    form.addEventListener("reset", resetValue);
    return () => form.removeEventListener("reset", resetValue);
  }, [defaultValue]);

  function setPreset(daysFromNow: number) {
    const next = new Date();
    next.setDate(next.getDate() + daysFromNow);
    next.setHours(daysFromNow === 0 ? 17 : 10, 0, 0, 0);
    const formatted = formatDateTimeLocal(next);
    setValue(formatted);
    if (inputRef.current) inputRef.current.value = formatted;
    onCommit?.(formatted);
  }

  function handleChange(nextValue: string, commit = false) {
    setValue(nextValue);
    if (commit) onCommit?.(nextValue);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-2">
      <label className="block text-xs text-zinc-400">
        {label}
        <input
          ref={inputRef}
          name={name}
          type="datetime-local"
          defaultValue={defaultValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={(event) => handleChange(event.target.value, true)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 transition focus:border-cyan-300"
        />
      </label>
      <div className={`mt-2 grid gap-1 ${compact ? "grid-cols-2" : "grid-cols-4"}`}>
        {[
          { label: "Today", days: 0 },
          { label: "+1d", days: 1 },
          { label: "+3d", days: 3 },
          { label: "+1w", days: 7 },
        ].map((preset) => (
          <button
            key={`${label}-${preset.label}`}
            type="button"
            onClick={() => setPreset(preset.days)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-cyan-300 hover:text-cyan-100"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-zinc-500">
          {value ? `Scheduled ${formatDisplayDate(value)}` : "Pick a date or use a quick option."}
        </p>
      )}
    </div>
  );
}

function FollowUpCenter({ referrals }: { referrals: ReferralWithFollowUps[] }) {
  const scheduled = referrals
    .filter((referral) => referral.nextFollowUpAt)
    .sort((a, b) => new Date(a.nextFollowUpAt ?? 0).getTime() - new Date(b.nextFollowUpAt ?? 0).getTime());
  const history = referrals.flatMap((referral) =>
    referral.followUps.map((followUp) => ({
      ...followUp,
      contactName: referral.contactName,
      contactCompany: referral.contactCompany,
      status: referral.status,
    })),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Scheduled Follow-ups</h3>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            {scheduled.filter((referral) => isDue(referral.nextFollowUpAt)).length} due
          </span>
        </div>
        {scheduled.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-4 text-sm text-zinc-400">
            No follow-ups scheduled yet.
          </p>
        ) : (
          <div className="space-y-2">
            {scheduled.map((referral) => (
              <div key={referral.id} className="rounded-xl border border-white/10 bg-zinc-950/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{referral.contactName}</p>
                    <p className="text-xs text-zinc-500">{referral.contactCompany || "Company pending"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${isDue(referral.nextFollowUpAt) ? "bg-amber-500/15 text-amber-200" : "bg-zinc-800 text-zinc-300"}`}>
                    {isDue(referral.nextFollowUpAt) ? "Due" : "Scheduled"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">{formatDisplayDate(referral.nextFollowUpAt)}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatEnum(referral.status)}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Follow-up History</h3>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-4 text-sm text-zinc-400">
            Logged follow-ups will appear here across every referral for this opportunity.
          </p>
        ) : (
          <div className="space-y-2">
            {history
              .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
              .map((followUp) => (
                <div key={followUp.id} className="rounded-xl border border-white/10 bg-zinc-950/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-100">{followUp.contactName}</p>
                    <p className="text-xs text-zinc-500">{formatDisplayDate(followUp.sentAt)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">{followUp.message}</p>
                  {followUp.nextFollowUpAt && (
                    <p className="mt-2 text-xs text-zinc-500">Next: {formatDisplayDate(followUp.nextFollowUpAt)}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </article>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
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

function HeaderPill({
  label,
  value,
  accent = "border-zinc-700 bg-zinc-950 text-zinc-200",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${accent}`}>
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function asBulletMarkdown(value?: string | null): string {
  if (!value || !value.trim()) return "";
  const lines = splitSkills(value);
  if (lines.length === 0) return "";
  return lines.map((line) => `- ${line}`).join("\n");
}

function asParagraphOrBullet(value?: string | null): string {
  if (!value || !value.trim()) return "";
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return value;
  return lines.map((line) => `- ${line}`).join("\n");
}

function splitSkills(value?: string | null): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(",")
    .map((part) => toTitleCase(part.trim()))
    .filter(Boolean);
}

function buildReferralRequestMessage(
  opportunity: Pick<Opportunity, "companyName" | "roleTitle">,
  referral: Pick<ReferralRequest, "contactName" | "channel">,
): string {
  const greeting = referral.contactName ? `Hi ${firstName(referral.contactName)},` : "Hi,";
  const companyRole = `${opportunity.roleTitle} role at ${opportunity.companyName}`;
  if (referral.channel === "EMAIL") {
    return `${greeting}\n\nI noticed an opening for the ${companyRole} and wanted to ask if you would be open to referring me or pointing me to the right person. I would be happy to share my resume and a short summary of why I am a fit.\n\nThanks,\n`;
  }

  return `${greeting}\n\nI saw the ${companyRole} and wanted to ask if you would be open to referring me. I can share my resume and a short fit summary if helpful.\n\nThanks!`;
}

function buildReferralFollowUpMessage(
  opportunity: Pick<Opportunity, "companyName" | "roleTitle">,
  referral: Pick<ReferralRequest, "contactName">,
): string {
  const greeting = referral.contactName ? `Hi ${firstName(referral.contactName)},` : "Hi,";
  return `${greeting}\n\nJust following up on my note about the ${opportunity.roleTitle} role at ${opportunity.companyName}. Please let me know if a referral is possible or if there is a better person I should contact.\n\nThanks!`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTimeLocal(value?: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDisplayDate(value?: Date | string | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes().toString().padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${month} ${day}, ${hour12}:${minute} ${ampm}`;
}

function isDue(value?: Date | string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

function hasValue(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "not specified" && normalized !== "not available";
}

function hasMeaningfulRaw(op: Opportunity): boolean {
  return (
    hasValue(op.scrapedRawText) ||
    hasValue(op.requiredSkills) ||
    hasValue(op.preferredSkills) ||
    hasValue(op.responsibilities) ||
    hasValue(op.qualifications) ||
    hasValue(op.aiRecommendationReason)
  );
}

function toTitleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function scoreBarClass(score: number): string {
  if (score >= 80) return "bg-gradient-to-r from-emerald-400 via-lime-400 to-green-500";
  if (score >= 60) return "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500";
  return "bg-gradient-to-r from-rose-400 via-red-400 to-pink-500";
}

function extractSourceMode(reason?: string | null): string {
  if (!reason) return "Not available";
  const match = reason.match(/Source mode:\s*(fetch|playwright)/i);
  if (!match) return "Not available";
  return match[1].toLowerCase();
}

function SkillCard({
  title,
  skills,
  copiedSkill,
  onCopy,
}: {
  title: string;
  skills: string[];
  copiedSkill: string;
  onCopy: (skill: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,.16)]">
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      {skills.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">Not available yet</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={`${title}-${skill}`}
              onClick={() => onCopy(skill)}
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
              title="Copy skill"
            >
              {skill}
              {copiedSkill === skill ? "  Copied" : ""}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <input name={name} defaultValue={value} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 text-sm text-zinc-100 transition focus:border-cyan-300" />
    </label>
  );
}

function Textarea({ label, name, rows }: { label: string; name: string; rows: number }) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <textarea name={name} rows={rows} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-100 transition focus:border-cyan-300" />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-100">{value}</p>
    </div>
  );
}

function DataCard({ title, value, large = false }: { title: string; value?: string | null; large?: boolean }) {
  return (
    <article className={`rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,.16)] ${large ? "lg:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">{value && value.trim() ? value : ""}</p>
    </article>
  );
}

function MarkdownDataCard({
  title,
  markdown,
  large = false,
}: {
  title: string;
  markdown: string;
  large?: boolean;
}) {
  return (
    <article className={`rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,.16)] ${large ? "lg:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-2 prose prose-invert max-w-none prose-p:my-1 prose-li:my-1 prose-ul:my-1 prose-headings:my-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </article>
  );
}

function splitToPoints(value: string): string[] {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Responsibilities\s*:/gi, "")
    .replace(/Qualifications\s*:/gi, "")
    .replace(/Requirements\s*:/gi, "")
    .trim();

  const primarySplit = normalized
    .replace(/[·•]/g, "\n")
    .replace(/\s-\s/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sentenceExpanded: string[] = [];
  for (const part of primarySplit) {
    if (part.length > 220) {
      sentenceExpanded.push(
        ...part
          .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
          .map((p) => p.trim())
          .filter((p) => p.length > 12),
      );
    } else {
      sentenceExpanded.push(part);
    }
  }

  const cleaned = sentenceExpanded
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 10)
    .map((line) => (line.endsWith(".") ? line : `${line}.`));

  return cleaned.length > 0 ? cleaned : [normalized];
}

function toStrictBulletMarkdown(value: string): string {
  const points = splitToPoints(value)
    .map((line) => line.replace(/^[-*•·]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.endsWith(".") ? line : `${line}.`));

  if (points.length === 0) {
    return "- No points extracted.";
  }

  return points.map((line) => `- ${line}`).join("\n");
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

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_COLORS: Record<string, { dot: string; line: string; badge: string; label: string }> = {
  SAVED: { dot: "bg-cyan-400", line: "bg-cyan-400/30", badge: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200", label: "Saved" },
  APPLIED: { dot: "bg-emerald-400", line: "bg-emerald-400/30", badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", label: "Applied" },
  INTERVIEW: { dot: "bg-amber-400", line: "bg-amber-400/30", badge: "border-amber-400/30 bg-amber-400/10 text-amber-200", label: "OA / Interview" },
  BETTER_LUCK_NEXT_TIME: { dot: "bg-rose-400", line: "bg-rose-400/30", badge: "border-rose-400/30 bg-rose-400/10 text-rose-200", label: "Better luck next time" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.SAVED;
}

function relativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

function daysBetween(a: Date | string, b: Date | string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TimelineView({
  createdAt,
  statusHistory,
}: {
  createdAt: Date | string;
  statusHistory: StatusHistory[];
}) {
  type TimelineEvent = {
    id: string;
    label: string;
    description: string;
    timestamp: Date | string;
    status: string;
  };

  const events: TimelineEvent[] = [];

  // First event: opportunity created
  events.push({
    id: "created",
    label: "Opportunity created",
    description: "Added to your pipeline",
    timestamp: createdAt,
    status: "SAVED",
  });

  // Status transitions
  for (let i = 0; i < statusHistory.length; i++) {
    const entry = statusHistory[i];
    if (entry.fromStatus === entry.toStatus && i === 0) continue; // skip initial identical entry
    const fromColor = getStatusColor(entry.fromStatus);
    const toColor = getStatusColor(entry.toStatus);
    events.push({
      id: entry.id,
      label: `${fromColor.label} → ${toColor.label}`,
      description: `Status changed`,
      timestamp: entry.changedAt,
      status: entry.toStatus,
    });
  }

  // Sort by timestamp ascending
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
        <p className="text-sm text-zinc-500">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0 pl-6">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-zinc-700/50" />

      {events.map((event, idx) => {
        const color = getStatusColor(event.status);
        const isLast = idx === events.length - 1;
        const daysInStage =
          idx < events.length - 1
            ? daysBetween(event.timestamp, events[idx + 1].timestamp)
            : daysBetween(event.timestamp, new Date());

        return (
          <div key={event.id} className="relative pb-6 last:pb-0">
            {/* Dot */}
            <div className={`absolute -left-6 top-1 h-[10px] w-[10px] rounded-full ring-[3px] ring-zinc-950 ${color.dot}`} />

            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-4 transition hover:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${color.badge}`}>
                  {color.label}
                </span>
                <span className="text-xs text-zinc-500">{formatDate(event.timestamp)}</span>
                <span className="text-[11px] text-zinc-600">({relativeTime(event.timestamp)})</span>
              </div>

              <p className="mt-2 text-sm font-medium text-zinc-200">{event.label}</p>

              {/* Days in stage badge */}
              {(daysInStage > 0 || isLast) && (
                <div className="mt-2 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-[11px] text-zinc-500">
                    {isLast
                      ? `${daysInStage} day${daysInStage !== 1 ? "s" : ""} in current stage`
                      : `${daysInStage} day${daysInStage !== 1 ? "s" : ""} until next transition`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
