import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_TRACKING_ENABLED } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createReferralFollowUpSchema } from "@/lib/validations";

function disabledResponse() {
  return NextResponse.json(
    { error: "Referral tracking is disabled." },
    { status: 404 },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!REFERRAL_TRACKING_ENABLED) return disabledResponse();

  const { id } = await context.params;

  try {
    const payload = createReferralFollowUpSchema.parse(await request.json());
    const referral = await prisma.$transaction(async (tx) => {
      await tx.referralFollowUp.create({
        data: {
          referralRequestId: id,
          message: payload.message,
          sentAt: payload.sentAt ?? undefined,
          nextFollowUpAt: payload.nextFollowUpAt,
        },
      });

      return tx.referralRequest.update({
        where: { id },
        data: {
          status: "FOLLOWED_UP",
          lastMessage: payload.message,
          nextFollowUpAt: payload.nextFollowUpAt,
        },
        include: { followUps: { orderBy: { sentAt: "desc" } } },
      });
    });

    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid follow-up payload", detail: `${error}` },
      { status: 400 },
    );
  }
}
