import { notFound } from "next/navigation";
import { OpportunityDetailClient } from "@/components/opportunity-detail-client";
import { REFERRAL_TRACKING_ENABLED } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      statusHistory: { orderBy: { changedAt: "asc" } },
      referralRequests: {
        include: {
          followUps: { orderBy: { sentAt: "desc" } },
        },
      },
    },
  });
  if (!opportunity) notFound();

  return (
    <OpportunityDetailClient
      initial={opportunity}
      referralTrackingEnabled={REFERRAL_TRACKING_ENABLED}
    />
  );
}
