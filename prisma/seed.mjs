import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.opportunity.count();
  if (count > 0) return;

  await prisma.opportunity.createMany({
    data: [
      {
        companyName: "Acme Systems",
        roleTitle: "Backend Engineer",
        source: "MANUAL",
        status: "SAVED",
        jobUrl: "https://example.com/jobs/backend-engineer",
        location: "Remote",
        retentionDays: 14,
      },
      {
        companyName: "Northstar Labs",
        roleTitle: "Platform Engineer",
        source: "MANUAL",
        status: "APPLIED",
        jobUrl: "https://example.com/jobs/platform-engineer",
        location: "Bangalore",
        retentionDays: 21,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
