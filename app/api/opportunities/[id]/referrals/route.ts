import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_TRACKING_ENABLED } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createReferralSchema } from "@/lib/validations";

function disabledResponse() {
  return NextResponse.json(
    { error: "Referral tracking is disabled." },
    { status: 404 },
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!REFERRAL_TRACKING_ENABLED) return disabledResponse();

  const { id } = await context.params;
  const referrals = await prisma.referralRequest.findMany({
    where: { opportunityId: id },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    include: { followUps: { orderBy: { sentAt: "desc" } } },
  });

  return NextResponse.json({ data: referrals });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!REFERRAL_TRACKING_ENABLED) return disabledResponse();

  const { id } = await context.params;

  try {
    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const payload = createReferralSchema.parse(await request.json());
    const referral = await prisma.referralRequest.create({
      data: {
        ...payload,
        opportunityId: id,
      },
      include: { followUps: { orderBy: { sentAt: "desc" } } },
    });

    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid referral payload", detail: `${error}` },
      { status: 400 },
    );
  }
}
