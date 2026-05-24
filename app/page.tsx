import { DashboardClient } from "@/components/dashboard-client";
import { prisma } from "@/lib/prisma";
import { applyRetentionTransitions } from "@/lib/retention";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await applyRetentionTransitions();
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <DashboardClient initialData={opportunities} />;
}
