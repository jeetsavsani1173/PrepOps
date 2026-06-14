"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AnalyticsData = {
  funnel: { saved: number; applied: number; interview: number; closed: number };
  conversionRates: { savedToApplied: number; appliedToInterview: number };
  weeklyActivity: Array<{ week: string; count: number }>;
  avgTimeInStage: { SAVED: number; APPLIED: number; INTERVIEW: number };
  topSkills: Array<{ skill: string; count: number }>;
  staleCount: number;
  matchScoreDistribution: { low: number; medium: number; high: number };
  totalOpportunities: number;
  totalReferrals: number;
  averageMatchScore: number | null;
};

const periodOptions = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last 1 year" },
  { value: "all", label: "All time" },
] as const;

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");

  async function loadAnalytics(p: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      loadAnalytics(period);
    });
  }, [period]);

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <header className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,.12),rgba(59,130,246,.08)_42%,rgba(245,158,11,.08))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 transition hover:border-cyan-300/70 hover:bg-zinc-800"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-50 sm:text-3xl">Analytics</h1>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Pipeline Performance</p>
              </div>
            </div>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 text-sm text-zinc-200 transition focus:border-cyan-300"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {loading || !data ? (
        <div className="grid place-items-center rounded-2xl border border-white/10 bg-zinc-950/70 p-16">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
            <p className="text-sm text-zinc-500">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stale Alert */}
          {data.staleCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <svg className="h-5 w-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-200">
                <span className="font-bold">{data.staleCount} stale application{data.staleCount !== 1 ? "s" : ""}</span>
                {" "}sitting in &quot;Applied&quot; with no activity for 10+ days. Consider following up!
              </p>
            </div>
          )}

          {/* Summary Cards */}
          <section className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Total Opportunities"
              value={`${data.totalOpportunities}`}
              accent="text-cyan-100"
              detail="In selected period"
            />
            <StatCard
              label="Active Pipeline"
              value={`${data.funnel.applied + data.funnel.interview}`}
              accent="text-emerald-100"
              detail="Applied or interviewing"
            />
            <StatCard
              label="Referrals Sent"
              value={`${data.totalReferrals}`}
              accent="text-indigo-100"
              detail="Across all opportunities"
            />
            <StatCard
              label="Avg Match Score"
              value={data.averageMatchScore !== null ? `${data.averageMatchScore}%` : "—"}
              accent="text-amber-100"
              detail="AI-computed average"
            />
          </section>

          {/* Funnel + Conversion */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-xl backdrop-blur">
              <SectionTitle label="Pipeline" title="Funnel" />
              <div className="mt-4 space-y-3">
                <FunnelBar label="Saved" count={data.funnel.saved} total={data.totalOpportunities} color="bg-cyan-400" />
                <FunnelBar label="Applied" count={data.funnel.applied} total={data.totalOpportunities} color="bg-emerald-400" />
                <FunnelBar label="OA / Interview" count={data.funnel.interview} total={data.totalOpportunities} color="bg-amber-400" />
                <FunnelBar label="Closed" count={data.funnel.closed} total={data.totalOpportunities} color="bg-rose-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-300">{data.conversionRates.savedToApplied}%</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Saved → Applied</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-300">{data.conversionRates.appliedToInterview}%</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Applied → Interview</p>
                </div>
              </div>
            </div>

            {/* Avg Time in Stage */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-xl backdrop-blur">
              <SectionTitle label="Velocity" title="Avg Time in Stage" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <TimeCard label="Saved" days={data.avgTimeInStage.SAVED} color="text-cyan-300" />
                <TimeCard label="Applied" days={data.avgTimeInStage.APPLIED} color="text-emerald-300" />
                <TimeCard label="Interview" days={data.avgTimeInStage.INTERVIEW} color="text-amber-300" />
              </div>
              <div className="mt-6">
                <SectionTitle label="Distribution" title="Match Scores" />
                <div className="mt-3">
                  <MatchScoreBar low={data.matchScoreDistribution.low} medium={data.matchScoreDistribution.medium} high={data.matchScoreDistribution.high} />
                </div>
              </div>
            </div>
          </section>

          {/* Weekly Activity + Top Skills */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Weekly Activity */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-xl backdrop-blur">
              <SectionTitle label="Activity" title="Weekly Applications" />
              <div className="mt-4 flex h-[180px] items-end gap-2">
                {data.weeklyActivity.map((w) => {
                  const maxCount = Math.max(...data.weeklyActivity.map((x) => x.count), 1);
                  const heightPct = Math.max(4, (w.count / maxCount) * 100);
                  return (
                    <div key={w.week} className="group flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-cyan-200 opacity-0 transition group-hover:opacity-100">
                        {w.count}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/80 to-cyan-400/40 transition-all duration-300 group-hover:from-cyan-400 group-hover:to-cyan-300/60"
                        style={{ height: `${heightPct}%`, minHeight: "4px" }}
                      />
                      <span className="text-[9px] text-zinc-500 truncate max-w-full">{w.week}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Skills */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-xl backdrop-blur">
              <SectionTitle label="Demand" title="Top Skills Required" />
              {data.topSkills.length > 0 ? (
                <div className="mt-4 space-y-2.5">
                  {data.topSkills.map((s) => {
                    const maxCount = data.topSkills[0].count;
                    const widthPct = Math.max(8, (s.count / maxCount) * 100);
                    return (
                      <div key={s.skill} className="group flex items-center gap-3">
                        <span className="w-28 truncate text-xs font-medium text-zinc-300 capitalize">{s.skill}</span>
                        <div className="relative flex-1 h-5 rounded-lg bg-zinc-800/50 overflow-hidden">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-indigo-500/70 to-violet-500/50 transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-[11px] font-semibold text-zinc-400">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500 italic">No skills data available. Run AI analysis on your opportunities to populate this chart.</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/* ——— Sub-components ——— */

function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <h2 className="mt-1 text-base font-semibold text-zinc-100">{title}</h2>
    </div>
  );
}

function StatCard({ label, value, accent, detail }: { label: string; value: string; accent: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/65 p-4 shadow-[0_12px_36px_rgba(0,0,0,.18)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-500">{count} ({pct}%)</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800/60">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}

function TimeCard({ label, days, color }: { label: string; days: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{days > 0 ? days : "—"}</p>
      <p className="mt-1 text-[11px] text-zinc-500">days in {label}</p>
    </div>
  );
}

function MatchScoreBar({ low, medium, high }: { low: number; medium: number; high: number }) {
  const total = low + medium + high;
  if (total === 0) {
    return <p className="text-sm text-zinc-500 italic">No scored opportunities yet.</p>;
  }

  const lowPct = Math.round((low / total) * 100);
  const medPct = Math.round((medium / total) * 100);
  const highPct = Math.round((high / total) * 100);

  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {lowPct > 0 && (
          <div
            className="bg-rose-500/70 transition-all duration-500"
            style={{ width: `${lowPct}%` }}
          />
        )}
        {medPct > 0 && (
          <div
            className="bg-amber-500/70 transition-all duration-500"
            style={{ width: `${medPct}%` }}
          />
        )}
        {highPct > 0 && (
          <div
            className="bg-emerald-500/70 transition-all duration-500"
            style={{ width: `${highPct}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
        <span>🔴 Low (0-40): {low}</span>
        <span>🟡 Mid (41-70): {medium}</span>
        <span>🟢 High (71-100): {high}</span>
      </div>
    </div>
  );
}
