import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeAndAnalyzeJob } from "@/lib/scrape-job";
import { scrapeJobSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const { url, opportunityId } = scrapeJobSchema.parse(await request.json());

    const analysis = await scrapeAndAnalyzeJob(url);

    if (opportunityId) {
      const current = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (!current) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({
          where: { id: opportunityId },
          data: {
            roleTitle: analysis.roleTitle !== "Unknown Role" ? analysis.roleTitle : current.roleTitle,
            companyName:
              current.companyName === "Unknown Company" && analysis.companyName !== "Unknown Company"
                ? analysis.companyName
                : current.companyName,
            jobUrl: url,
            salary: analysis.salary !== "Not specified" ? analysis.salary : current.salary,
            location: analysis.location !== "Not specified" ? analysis.location : current.location,
            scrapedRawText: analysis.cleanedText.slice(0, 100000),
            responsibilities: analysis.responsibilities.join("\n") || undefined,
            qualifications: analysis.qualifications.join("\n") || undefined,
            requiredSkills: analysis.requiredSkills.join(", ") || undefined,
            preferredSkills: analysis.preferredSkills.join(", ") || undefined,
            experienceLevel: analysis.experienceLevel,
            employmentType: analysis.employmentType,
            workModel: analysis.workModel,
            aiMatchScore: analysis.aiMatchScore,
            applicationDecision: analysis.applicationDecision,
            prepDifficulty: analysis.prepDifficulty,
            aiRecommendationReason: analysis.aiRecommendationReason,
          },
        });
      });
    }

    return NextResponse.json({ data: analysis });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scrape and analyze job", detail: `${error}` },
      { status: 400 },
    );
  }
}
