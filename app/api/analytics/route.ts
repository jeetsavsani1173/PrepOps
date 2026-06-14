import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "all";

  const now = new Date();
  const periodMap: Record<string, number> = {
    "30d": 30,
    "90d": 90,
    "6m": 180,
    "1y": 365,
  };
  const periodDays = periodMap[period];
  const fromDate = periodDays
    ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    : undefined;

  const dateFilter = fromDate ? { createdAt: { gte: fromDate } } : {};

  // All opportunities in period
  const opportunities = await prisma.opportunity.findMany({
    where: dateFilter,
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requiredSkills: true,
      aiMatchScore: true,
    },
  });

  // Funnel counts
  const funnel = {
    saved: opportunities.filter((o) => o.status === "SAVED").length,
    applied: opportunities.filter((o) => o.status === "APPLIED").length,
    interview: opportunities.filter((o) => o.status === "INTERVIEW").length,
    closed: opportunities.filter((o) => o.status === "BETTER_LUCK_NEXT_TIME").length,
  };

  const total = opportunities.length;
  const conversionRates = {
    savedToApplied: total > 0 ? Math.round(((funnel.applied + funnel.interview + funnel.closed) / total) * 100) : 0,
    appliedToInterview: (funnel.applied + funnel.interview + funnel.closed) > 0
      ? Math.round(((funnel.interview + funnel.closed) / (funnel.applied + funnel.interview + funnel.closed)) * 100)
      : 0,
  };

  // Weekly activity (last 8 weeks)
  const weeklyActivity: Array<{ week: string; count: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count = opportunities.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= weekStart && created < weekEnd;
    }).length;

    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeklyActivity.push({ week: label, count });
  }

  // Average time in stage (using status history)
  const statusHistories = await prisma.statusHistory.findMany({
    where: {
      opportunity: dateFilter,
    },
    orderBy: { changedAt: "asc" },
    select: {
      opportunityId: true,
      fromStatus: true,
      toStatus: true,
      changedAt: true,
    },
  });

  // Group by opportunity
  const historyByOp: Record<string, typeof statusHistories> = {};
  for (const entry of statusHistories) {
    if (!historyByOp[entry.opportunityId]) historyByOp[entry.opportunityId] = [];
    historyByOp[entry.opportunityId].push(entry);
  }

  const stageDurations: Record<string, number[]> = {
    SAVED: [],
    APPLIED: [],
    INTERVIEW: [],
  };

  for (const op of opportunities) {
    const history = historyByOp[op.id] ?? [];
    // Walk through transitions and compute time spent in each stage
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      if (entry.fromStatus === entry.toStatus) continue;
      // Find how long from creation (or previous transition) to this transition
      const prevTime = i > 0 ? new Date(history[i - 1].changedAt) : new Date(op.createdAt);
      const currentTime = new Date(entry.changedAt);
      const daysInStage = Math.max(0, (currentTime.getTime() - prevTime.getTime()) / 86400000);
      if (stageDurations[entry.fromStatus]) {
        stageDurations[entry.fromStatus].push(daysInStage);
      }
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
  const avgTimeInStage = {
    SAVED: avg(stageDurations.SAVED),
    APPLIED: avg(stageDurations.APPLIED),
    INTERVIEW: avg(stageDurations.INTERVIEW),
  };

  // Top 10 most demanded skills
  const skillCounter: Record<string, number> = {};
  for (const op of opportunities) {
    if (!op.requiredSkills) continue;
    const skills = op.requiredSkills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    for (const skill of skills) {
      skillCounter[skill] = (skillCounter[skill] || 0) + 1;
    }
  }
  const topSkills = Object.entries(skillCounter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // Stale applications (APPLIED for 10+ days)
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const staleCount = opportunities.filter(
    (o) => o.status === "APPLIED" && new Date(o.updatedAt) < tenDaysAgo
  ).length;

  // Match score distribution
  const scored = opportunities.filter((o) => typeof o.aiMatchScore === "number");
  const matchScoreDistribution = {
    low: scored.filter((o) => o.aiMatchScore! <= 40).length,
    medium: scored.filter((o) => o.aiMatchScore! > 40 && o.aiMatchScore! <= 70).length,
    high: scored.filter((o) => o.aiMatchScore! > 70).length,
  };

  // Total referrals
  const totalReferrals = await prisma.referralRequest.count({
    where: { opportunity: dateFilter },
  });

  // Average match score
  const matchScores = scored.map((o) => o.aiMatchScore!);
  const averageMatchScore =
    matchScores.length > 0
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
      : null;

  return NextResponse.json({
    data: {
      funnel,
      conversionRates,
      weeklyActivity,
      avgTimeInStage,
      topSkills,
      staleCount,
      matchScoreDistribution,
      totalOpportunities: total,
      totalReferrals,
      averageMatchScore,
    },
  });
}
