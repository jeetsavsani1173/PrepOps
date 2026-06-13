import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { AI_ENABLED } from "./env";
import { LLMProviderFactory } from "./ai/providers/factory";
import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

export type JobAnalysis = {
  roleTitle: string;
  companyName: string;
  location: string;
  responsibilities: string[];
  qualifications: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  employmentType: string;
  workModel: string;
  salary: string;
  applicationDecision: "APPLY_NOW" | "APPLY_AFTER_PREP" | "SKIP";
  prepDifficulty: "LOW" | "MEDIUM" | "HIGH";
  aiMatchScore: number;
  aiRecommendationReason: string;
  cleanedText: string;
};

type JobPostingLd = {
  title?: string;
  companyName?: string;
  location?: string;
  employmentType?: string;
  salary?: string;
};

const skillDictionary = [
  "java", "spring", "spring boot", "react", "node", "typescript", "javascript", "kafka", "redis",
  "kubernetes", "docker", "aws", "gcp", "azure", "postgresql", "mysql", "mongodb", "microservices",
  "system design", "distributed systems", "dsa", "algorithms", "data structures", "oop", "api design",
  "rest", "graphql", "ci/cd", "terraform",
];

export async function scrapeAndAnalyzeJob(url: string): Promise<JobAnalysis> {
  const { html, text, mode } = await fetchPageContent(url);
  const cleanedText = cleanText(text, html);

  if (AI_ENABLED) {
    try {
      const resume = await prisma.resumeSnapshot.findFirst();
      let resumeText = "";
      if (resume) {
        const txtPath = path.join(process.cwd(), "storage", "resumes", "resume.txt");
        if (fs.existsSync(txtPath)) {
          resumeText = fs.readFileSync(txtPath, "utf8");
        } else {
          resumeText = resume.extractedSkillsText || "";
        }
      }

      const provider = LLMProviderFactory.getProvider();
      const aiResult = await provider.analyzeJob(cleanedText, resumeText);

      return {
        roleTitle: aiResult.roleTitle,
        companyName: aiResult.companyName,
        location: aiResult.location,
        responsibilities: aiResult.responsibilities,
        qualifications: aiResult.qualifications,
        requiredSkills: aiResult.requiredSkills,
        preferredSkills: aiResult.preferredSkills,
        experienceLevel: aiResult.experienceLevel,
        employmentType: aiResult.employmentType,
        workModel: aiResult.workModel,
        salary: aiResult.salary,
        applicationDecision: aiResult.applicationDecision,
        prepDifficulty: aiResult.prepDifficulty,
        aiMatchScore: aiResult.aiMatchScore,
        aiRecommendationReason: `${aiResult.aiRecommendationReason} Source mode: ${mode} (AI).`,
        cleanedText,
      };
    } catch (e) {
      console.error("AI Job parsing failed, falling back to rules-based:", e);
    }
  }

  const jsonLd = extractJobPostingJsonLd(html);

  const roleTitle = pickRoleTitle(html, cleanedText, jsonLd);
  const companyName = pickCompanyName(html, jsonLd);
  const responsibilities = extractSectionItems(cleanedText, [
    "responsibilities", "what you'll do", "what you will do", "your role", "what you bring",
  ]);
  const qualifications = extractSectionItems(cleanedText, [
    "qualifications", "minimum qualifications", "basic qualifications", "requirements",
  ]);
  const requiredSkills = extractSkills(cleanedText, "required");
  const preferredSkills = extractSkills(cleanedText, "preferred");
  const experienceLevel = extractExperience(cleanedText);
  const employmentType = extractEmploymentType(cleanedText, jsonLd);
  const workModel = extractWorkModel(cleanedText, jsonLd.location ?? "");
  const location = extractLocation(cleanedText, html, jsonLd, workModel);
  const salary = extractSalary(cleanedText, jsonLd);

  const score = computeMatchScore({ requiredSkills, preferredSkills, experienceLevel });
  const decision = computeDecision(score, requiredSkills.length, experienceLevel);

  return {
    roleTitle,
    companyName,
    location,
    responsibilities,
    qualifications,
    requiredSkills,
    preferredSkills,
    experienceLevel,
    employmentType,
    workModel,
    salary,
    aiMatchScore: score,
    applicationDecision: decision.applicationDecision,
    prepDifficulty: decision.prepDifficulty,
    aiRecommendationReason: `${decision.reason} Source mode: ${mode}.`,
    cleanedText,
  };
}

async function fetchPageContent(url: string): Promise<{ html: string; text: string; mode: "fetch" | "playwright" }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();
  const basicText = htmlToText(html);

  if (basicText.length > 4000 && !looksJavaScriptOnly(basicText)) {
    return { html, text: basicText, mode: "fetch" };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  const renderedHtml = await page.content();
  const renderedText = await page.evaluate(() => document.body?.innerText ?? "");
  await browser.close();

  return { html: renderedHtml, text: renderedText, mode: "playwright" };
}

function htmlToText(html: string): string {
  const dom = new JSDOM(html, { url: "https://example.com" });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article?.textContent && article.textContent.length > 700) {
    return article.textContent;
  }

  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, noscript, svg").remove();
  return $("body").text();
}

function cleanText(text: string, html: string): string {
  const title = cheerio.load(html)("title").text();
  return `${title}\n${text}`.replace(/\s+/g, " ").trim();
}

function looksJavaScriptOnly(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("enable javascript") || lower.includes("please wait") || lower.includes("access denied");
}

function extractJobPostingJsonLd(html: string): JobPostingLd {
  const $ = cheerio.load(html);
  const scripts = $("script[type='application/ld+json']").toArray();

  for (const script of scripts) {
    const raw = $(script).text().trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] ?? [])];

      for (const node of nodes) {
        const type = typeof node?.["@type"] === "string" ? node["@type"].toLowerCase() : "";
        if (!type.includes("jobposting")) continue;

        const locObj = node?.jobLocation?.address ?? node?.jobLocation?.[0]?.address;
        const locParts = [locObj?.addressLocality, locObj?.addressRegion, locObj?.addressCountry]
          .filter(Boolean)
          .join(", ");

        const salaryObj = node?.baseSalary?.value;
        const minV = salaryObj?.minValue;
        const maxV = salaryObj?.maxValue;
        const curr = node?.baseSalary?.currency;
        const salary = minV && maxV ? `${curr ?? ""} ${minV}-${maxV}`.trim() : undefined;

        return {
          title: node?.title,
          companyName: node?.hiringOrganization?.name,
          location: locParts || node?.jobLocationType,
          employmentType: Array.isArray(node?.employmentType) ? node.employmentType[0] : node?.employmentType,
          salary,
        };
      }
    } catch {
      continue;
    }
  }

  return {};
}

function pickRoleTitle(html: string, text: string, ld: JobPostingLd): string {
  if (ld.title?.trim()) return ld.title.trim();
  const $ = cheerio.load(html);
  const h1 = $("h1").first().text().trim();
  if (h1) return h1;
  const m = text.match(/(software|backend|frontend|full stack|site reliability|platform|data|ml|ai)\s+engineer/i);
  return m?.[0] ?? "Unknown Role";
}

function pickCompanyName(html: string, ld: JobPostingLd): string {
  if (ld.companyName?.trim()) return ld.companyName.trim();
  const $ = cheerio.load(html);
  return (
    $("meta[property='og:site_name']").attr("content")?.trim() ||
    $("meta[name='application-name']").attr("content")?.trim() ||
    "Unknown Company"
  );
}

function extractLocation(text: string, html: string, ld: JobPostingLd, workModel: string): string {
  if (ld.location?.trim()) return normalizeLocation(ld.location);

  const $ = cheerio.load(html);
  const attrHints = [
    "[data-test*='location']",
    "[class*='location']",
    "[id*='location']",
    "[data-qa*='location']",
  ];

  for (const sel of attrHints) {
    const hit = $(sel).first().text().trim();
    if (hit && hit.length > 2 && hit.length < 120) return normalizeLocation(hit);
  }

  const patterns = [
    /location\s*:?\s*([A-Za-z .,-]{3,80})/i,
    /based in\s+([A-Za-z .,-]{3,80})/i,
    /office\s*:?\s*([A-Za-z .,-]{3,80})/i,
  ];

  for (const rx of patterns) {
    const m = text.match(rx);
    if (m?.[1]) return normalizeLocation(m[1]);
  }

  return workModel === "REMOTE" ? "Remote" : "Not specified";
}

function normalizeLocation(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/\|/g, ", ").trim();
}

function extractSkills(text: string, mode: "required" | "preferred"): string[] {
  const lower = text.toLowerCase();
  const anchor = mode === "required" ? /(requirements|must have|required skills|minimum qualifications|basic qualifications)/i : /(preferred|nice to have|good to have|preferred qualifications)/i;
  const around = lower.search(anchor);
  const slice = around >= 0 ? lower.slice(around, around + 3500) : lower;
  return dedupe(skillDictionary.filter((skill) => slice.includes(skill))).slice(0, 14);
}

function extractSectionItems(text: string, anchors: string[]): string[] {
  const lower = text.toLowerCase();
  let index = -1;
  for (const anchor of anchors) {
    const i = lower.indexOf(anchor);
    if (i >= 0) {
      index = i;
      break;
    }
  }

  const section = index >= 0 ? text.slice(index, index + 2800) : text.slice(0, 2400);
  return dedupe(
    section
      .split(/[•\n\r\-]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 28),
  ).slice(0, 10);
}

function extractExperience(text: string): string {
  const m = text.match(/(\d{1,2})\+?\s*(?:to|-)?\s*(\d{0,2})?\s*years?\s+(?:of\s+)?experience/i);
  if (!m) return "Not specified";
  return m[2] ? `${m[1]}-${m[2]} years` : `${m[1]}+ years`;
}

function extractEmploymentType(text: string, ld: JobPostingLd): string {
  const hint = (ld.employmentType ?? "").toLowerCase();
  if (hint.includes("full")) return "FULL_TIME";
  if (hint.includes("contract")) return "CONTRACT";
  if (hint.includes("intern")) return "INTERN";
  if (/full[- ]?time/i.test(text)) return "FULL_TIME";
  if (/contract/i.test(text)) return "CONTRACT";
  if (/intern/i.test(text)) return "INTERN";
  return "Not specified";
}

function extractWorkModel(text: string, ldLocation: string): string {
  const source = `${text} ${ldLocation}`;
  if (/remote/i.test(source)) return "REMOTE";
  if (/hybrid/i.test(source)) return "HYBRID";
  if (/on[- ]?site|onsite/i.test(source)) return "ON_SITE";
  return "Not specified";
}

function extractSalary(text: string, ld: JobPostingLd): string {
  if (ld.salary?.trim()) return ld.salary.trim();
  const m = text.match(/((?:\$|₹|€|£)\s?\d[\d,]*(?:\s?[-–]\s?(?:\$|₹|€|£)?\s?\d[\d,]*)?)/);
  return m?.[1] ?? "Not specified";
}

function computeMatchScore({ requiredSkills, preferredSkills, experienceLevel }: { requiredSkills: string[]; preferredSkills: string[]; experienceLevel: string; }): number {
  let score = 45;
  score += Math.min(requiredSkills.length * 5, 32);
  score += Math.min(preferredSkills.length * 2, 10);
  if (experienceLevel.includes("+ years") || experienceLevel.includes("-")) score += 5;
  return Math.max(0, Math.min(100, score));
}

function computeDecision(score: number, requiredCount: number, experienceLevel: string) {
  if (score >= 78 && requiredCount >= 4) {
    return {
      applicationDecision: "APPLY_NOW" as const,
      prepDifficulty: "LOW" as const,
      reason: "Strong skill overlap with role expectations.",
    };
  }

  if (score >= 58) {
    return {
      applicationDecision: "APPLY_AFTER_PREP" as const,
      prepDifficulty: experienceLevel.includes("8") || experienceLevel.includes("10") ? "HIGH" as const : "MEDIUM" as const,
      reason: "Good fit potential, but targeted preparation is recommended.",
    };
  }

  return {
    applicationDecision: "SKIP" as const,
    prepDifficulty: "HIGH" as const,
    reason: "Low overlap with required skill signal in this posting.",
  };
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}
