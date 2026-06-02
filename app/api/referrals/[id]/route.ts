import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_TRACKING_ENABLED } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { updateReferralSchema } from "@/lib/validations";

function disabledResponse() {
  return NextResponse.json(
    { error: "Referral tracking is disabled." },
    { status: 404 },
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!REFERRAL_TRACKING_ENABLED) return disabledResponse();

  const { id } = await context.params;

  try {
    const payload = updateReferralSchema.parse(await request.json());
    const referral = await prisma.referralRequest.update({
      where: { id },
      data: payload,
      include: { followUps: { orderBy: { sentAt: "desc" } } },
    });

    return NextResponse.json({ data: referral });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid referral update", detail: `${error}` },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!REFERRAL_TRACKING_ENABLED) return disabledResponse();

  const { id } = await context.params;

  try {
    await prisma.referralRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }
}
