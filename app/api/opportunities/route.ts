import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyRetentionTransitions } from "@/lib/retention";
import { createOpportunitySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  await applyRetentionTransitions();
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const period = request.nextUrl.searchParams.get("period");

  const now = new Date();
  const periodMap: Record<string, number> = {
    "1d": 1,
    "1w": 7,
    "1m": 30,
    "1y": 365,
  };
  const periodDays = period ? periodMap[period] : undefined;
  const fromDate = periodDays
    ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    : undefined;

  const opportunities = await prisma.opportunity.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { companyName: { contains: query } },
              { jobUrl: { contains: query } },
            ],
          }
        : {}),
      ...(fromDate ? { createdAt: { gte: fromDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      prepTasks: true,
      statusHistory: { orderBy: { changedAt: "desc" }, take: 10 },
    },
  });

  return NextResponse.json({ data: opportunities });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const payload = createOpportunitySchema.parse(json);

    if (payload.jobUrl) {
      const existing = await prisma.opportunity.findFirst({ where: { jobUrl: payload.jobUrl } });
      if (existing) {
        return NextResponse.json(
          { data: existing, ignored: true, message: "Job link already saved." },
          { status: 200 },
        );
      }
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        ...payload,
        statusHistory: {
          create: {
            fromStatus: payload.status ?? "SAVED",
            toStatus: payload.status ?? "SAVED",
          },
        },
      },
    });

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate job link. This URL is already saved." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Invalid request payload", detail: `${error}` },
      { status: 400 },
    );
  }
}
