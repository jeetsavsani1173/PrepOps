"use client";

import { Opportunity } from "@prisma/client";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KANBAN_STATUSES } from "@/lib/constants";

type Props = { initial: Opportunity };
type DetailTab = "overview" | "requirements" | "compensation" | "raw";

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "compensation", label: "Compensation" },
  { id: "raw", label: "Raw Extract" },
];

export function OpportunityDetailClient({ initial }: Props) {
  const [opportunity, setOpportunity] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [copiedSkill, setCopiedSkill] = useState<string>("");

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
    if (!res.ok) return window.alert(json.error ?? "Failed to save");
    setOpportunity(json.data);
  }

  async function analyze() {
    if (!opportunity.jobUrl) return window.alert("Add a valid job URL first.");
    setAnalyzing(true);
    const res = await fetch("/api/scrape-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: opportunity.jobUrl, opportunityId: opportunity.id }),
    });
    const json = await res.json();
    setAnalyzing(false);
    if (!res.ok) return window.alert(json.error ?? "Analysis failed");

    const refreshed = await fetch(`/api/opportunities/${opportunity.id}`);
    const refreshedJson = await refreshed.json();
    if (refreshed.ok) setOpportunity(refreshedJson.data);
  }

  async function copySkill(skill: string) {
    try {
      await navigator.clipboard.writeText(skill);
      setCopiedSkill(skill);
      setTimeout(() => setCopiedSkill(""), 1200);
    } catch {
      window.alert(`Copy failed: ${skill}`);
    }
  }

  const markdownView = buildMarkdown(opportunity);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-6">
      <header className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div>
          <p className="text-sm text-zinc-400">Opportunity Detail</p>
          <h1 className="text-xl font-semibold text-zinc-100">{opportunity.roleTitle}</h1>
          <p className="text-sm text-zinc-400">{opportunity.companyName}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">Back</Link>
          {opportunity.jobUrl && (
            <a href={opportunity.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950">
              <ExternalIcon /> Apply
            </a>
          )}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Core Details</h2>
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
              <button type="button" onClick={analyze} className="w-full rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white" disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze Job"}
              </button>
              <button className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Decision Card</h2>
          {typeof opportunity.aiMatchScore === "number" && (
            <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
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
            <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
              {opportunity.aiRecommendationReason}
            </p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-1.5 text-sm transition ${
                tab === t.id ? "bg-indigo-500 text-white" : "border border-zinc-700 bg-zinc-900 text-zinc-300"
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

        {tab === "raw" && (
          hasMeaningfulRaw(opportunity) ? (
            <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-headings:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownView}</ReactMarkdown>
            </article>
          ) : null
        )}
      </section>
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
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      {skills.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">Not available yet</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={`${title}-${skill}`}
              onClick={() => onCopy(skill)}
              className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200 transition hover:border-indigo-300 hover:bg-indigo-500/20"
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
      <input name={name} defaultValue={value} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100" />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-100">{value}</p>
    </div>
  );
}

function DataCard({ title, value, large = false }: { title: string; value?: string | null; large?: boolean }) {
  return (
    <article className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 ${large ? "lg:col-span-2" : ""}`}>
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
    <article className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 ${large ? "lg:col-span-2" : ""}`}>
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
