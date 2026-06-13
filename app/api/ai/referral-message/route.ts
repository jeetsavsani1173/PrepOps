import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_ENABLED } from "@/lib/env";
import { LLMProviderFactory } from "@/lib/ai/providers/factory";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: "AI features are disabled. Please set AI_ENABLED='true' and set a GEMINI_API_KEY in your .env file." },
      { status: 403 }
    );
  }

  try {
    const { opportunityId, referralId } = await request.json();

    if (!opportunityId || !referralId) {
      return NextResponse.json({ error: "Missing opportunityId or referralId" }, { status: 400 });
    }

    // 1. Fetch Opportunity
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // 2. Fetch Referral
    const referral = await prisma.referralRequest.findUnique({
      where: { id: referralId },
    });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    // 3. Fetch Resume
    const resume = await prisma.resumeSnapshot.findFirst();
    if (!resume) {
      return NextResponse.json(
        { error: "Please upload your resume in the dashboard before generating a personalized referral message." },
        { status: 400 }
      );
    }

    let resumeContent = "";
    const txtPath = path.join(process.cwd(), "storage", "resumes", "resume.txt");
    if (fs.existsSync(txtPath)) {
      resumeContent = fs.readFileSync(txtPath, "utf8");
    } else {
      resumeContent = resume.extractedSkillsText || "";
    }

    if (!resumeContent.trim()) {
      return NextResponse.json({ error: "Resume content is empty. Please re-upload your resume." }, { status: 400 });
    }

    // 4. Generate message via Gemini
    const provider = LLMProviderFactory.getProvider();
    const result = await provider.generateReferral({
      resumeContent,
      jobTitle: opportunity.roleTitle,
      companyName: opportunity.companyName,
      jobDescription: opportunity.jobDescription || opportunity.scrapedRawText || "",
      contactName: referral.contactName,
      channel: referral.channel,
    });

    // 5. Update Referral message in SQLite database
    const updatedReferral = await prisma.referralRequest.update({
      where: { id: referralId },
      data: {
        initialMessage: result.message,
      },
      include: {
        followUps: { orderBy: { sentAt: "desc" } },
      },
    });

    return NextResponse.json({ success: true, data: updatedReferral });
  } catch (error) {
    console.error("Referral message generation failed:", error);
    const errorStr = `${error}`;

    // Detect Gemini rate-limit / quota errors
    if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit")) {
      return NextResponse.json(
        { error: "Gemini API quota exceeded. Your free-tier daily limit has been reached. Please wait for it to reset or enable billing at aistudio.google.com." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate referral message", detail: errorStr },
      { status: 500 }
    );
  }
}
