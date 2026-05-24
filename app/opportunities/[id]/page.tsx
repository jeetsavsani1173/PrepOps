import { notFound } from "next/navigation";
import { OpportunityDetailClient } from "@/components/opportunity-detail-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity) notFound();

  return <OpportunityDetailClient initial={opportunity} />;
}
