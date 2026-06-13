import "@/lib/ai/polyfill";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_ENABLED } from "@/lib/env";
import { LLMProviderFactory } from "@/lib/ai/providers/factory";
import fs from "fs";
import path from "path";
const pdfParseModule = require("pdf-parse");

const skillKeywords = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "nuxt", "node.js", "express", "nest.js", "django", "flask", "fastapi",
  "spring boot", "rails", "laravel", "html", "css", "tailwind", "bootstrap", "sass",
  "sql", "postgresql", "mysql", "sqlite", "oracle", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb",
  "aws", "azure", "gcp", "docker", "kubernetes", "git", "ci/cd", "graphql", "rest api", "soap",
  "microservices", "system design", "distributed systems", "agile", "scrum", "kanban",
  "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
  "testing", "jest", "cypress", "playwright", "selenium", "ci", "cd", "github actions"
];

function fallbackExtractSkills(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  const found: string[] = [];
  for (const skill of skillKeywords) {
    // Escape regex characters just in case
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    if (regex.test(lowercaseText) || lowercaseText.includes(skill.toLowerCase())) {
      // Capitalize first letters for clean rendering
      found.push(skill.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
    }
  }
  return [...new Set(found)].slice(0, 30);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF resumes are supported" }, { status: 400 });
    }

    // 1. Convert file to buffer and parse text
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parser = new pdfParseModule.PDFParse({ data: buffer, disableWorker: true });
    let extractedText = "";
    try {
      const pdfData = await parser.getText();
      extractedText = pdfData.text || "";
    } finally {
      await parser.destroy();
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: "Failed to extract text from the PDF" }, { status: 400 });
    }

    // 2. Ensure target storage directory exists
    const storageDir = path.join(process.cwd(), "storage", "resumes");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const pdfPath = path.join(storageDir, "resume.pdf");
    const txtPath = path.join(storageDir, "resume.txt");

    // Write file paths
    fs.writeFileSync(pdfPath, buffer);
    fs.writeFileSync(txtPath, extractedText, "utf8");

    // 3. Extract skills using AI if enabled, otherwise use keyword search fallback
    let extractedSkills: string[] = [];
    if (AI_ENABLED) {
      try {
        const provider = LLMProviderFactory.getProvider();
        const response = await provider.analyzeJob(
          `Extract a list of technical skills from this resume. Return a comma-separated list or JSON array. Resume:\n${extractedText}`
        );
        extractedSkills = response.requiredSkills || [];
      } catch (err) {
        console.error("AI Skill extraction failed, falling back to rule-based: ", err);
        extractedSkills = fallbackExtractSkills(extractedText);
      }
    } else {
      extractedSkills = fallbackExtractSkills(extractedText);
    }

    // 4. Persistence - single user design (maintain only one ResumeSnapshot record)
    const existing = await prisma.resumeSnapshot.findFirst();
    let resumeSnapshot;

    if (existing) {
      resumeSnapshot = await prisma.resumeSnapshot.update({
        where: { id: existing.id },
        data: {
          versionName: file.name,
          filePath: pdfPath,
          extractedSkillsText: extractedSkills.join(", "),
        },
      });
    } else {
      resumeSnapshot = await prisma.resumeSnapshot.create({
        data: {
          versionName: file.name,
          filePath: pdfPath,
          extractedSkillsText: extractedSkills.join(", "),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: resumeSnapshot.id,
        versionName: resumeSnapshot.versionName,
        skills: extractedSkills,
        createdAt: resumeSnapshot.createdAt,
      },
    });
  } catch (error) {
    console.error("Resume upload failed:", error);
    return NextResponse.json(
      { error: "Resume upload failed", detail: `${error}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const resume = await prisma.resumeSnapshot.findFirst();
    if (!resume) {
      return NextResponse.json({ data: null });
    }

    const skills = resume.extractedSkillsText
      ? resume.extractedSkillsText.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      data: {
        id: resume.id,
        versionName: resume.versionName,
        skills,
        updatedAt: resume.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch resume status", detail: `${error}` },
      { status: 500 }
    );
  }
}
