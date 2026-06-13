import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_ENABLED } from "@/lib/env";
import { LLMProviderFactory } from "@/lib/ai/providers/factory";
import fs from "fs";
import path from "path";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: "AI features are disabled. Please set AI_ENABLED='true' and provide a GEMINI_API_KEY in your .env file to run AI analysis." },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    // 1. Fetch the opportunity
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const jobText =
      opportunity.jobDescription ||
      opportunity.scrapedRawText ||
      `${opportunity.roleTitle} role at ${opportunity.companyName}`;

    // 2. Fetch user's uploaded resume if any
    const resume = await prisma.resumeSnapshot.findFirst();
    let resumeContent = "";

    if (resume) {
      const txtPath = path.join(process.cwd(), "storage", "resumes", "resume.txt");
      if (fs.existsSync(txtPath)) {
        resumeContent = fs.readFileSync(txtPath, "utf8");
      } else {
        resumeContent = resume.extractedSkillsText || "";
      }
    }

    // 3. Query the Gemini Provider via Factory
    const provider = LLMProviderFactory.getProvider();
    const aiResult = await provider.analyzeJob(jobText, resumeContent);

    // 4. Update the Opportunity in DB
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        roleTitle: aiResult.roleTitle || opportunity.roleTitle,
        companyName: aiResult.companyName || opportunity.companyName,
        location: aiResult.location !== "Not specified" ? aiResult.location : opportunity.location,
        salary: aiResult.salary !== "Not specified" ? aiResult.salary : opportunity.salary,
        employmentType: aiResult.employmentType !== "Not specified" ? aiResult.employmentType : opportunity.employmentType,
        workModel: aiResult.workModel !== "Not specified" ? aiResult.workModel : opportunity.workModel,
        experienceLevel: aiResult.experienceLevel !== "Not specified" ? aiResult.experienceLevel : opportunity.experienceLevel,
        requiredSkills: aiResult.requiredSkills.join(", ") || opportunity.requiredSkills,
        preferredSkills: aiResult.preferredSkills.join(", ") || opportunity.preferredSkills,
        responsibilities: aiResult.responsibilities.join("\n") || opportunity.responsibilities,
        qualifications: aiResult.qualifications.join("\n") || opportunity.qualifications,
        applicationDecision: aiResult.applicationDecision || opportunity.applicationDecision,
        prepDifficulty: aiResult.prepDifficulty || opportunity.prepDifficulty,
        aiMatchScore: aiResult.aiMatchScore ?? opportunity.aiMatchScore,
        aiRecommendationReason: aiResult.aiRecommendationReason || opportunity.aiRecommendationReason,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("AI Analysis failed:", error);
    const errorStr = `${error}`;

    // Detect Gemini rate-limit / quota errors
    if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit")) {
      return NextResponse.json(
        { error: "Gemini API quota exceeded. Your free-tier daily limit has been reached. Please wait for it to reset or enable billing at aistudio.google.com." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "AI Analysis failed", detail: errorStr },
      { status: 500 }
    );
  }
}
