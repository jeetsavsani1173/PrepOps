import { prisma } from "@/lib/prisma";

export async function applyRetentionTransitions() {
  const candidates = await prisma.opportunity.findMany({
    where: {
      status: {
        in: ["SAVED", "APPLIED"],
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      retentionDays: true,
    },
  });

  const now = Date.now();

  for (const item of candidates) {
    const ageDays = (now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= item.retentionDays) {
      await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({
          where: { id: item.id },
          data: { status: "BETTER_LUCK_NEXT_TIME" },
        });
        await tx.statusHistory.create({
          data: {
            opportunityId: item.id,
            fromStatus: item.status,
            toStatus: "BETTER_LUCK_NEXT_TIME",
          },
        });
      });
    }
  }
}
