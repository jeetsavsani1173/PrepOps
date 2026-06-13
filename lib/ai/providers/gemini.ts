import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { LLMProvider } from "./base";
import { JobSummaryResult, ReferralRequestParams, ReferralResponseResult } from "../types";
import {
  JOB_ANALYSIS_SYSTEM_INSTRUCTION,
  JOB_ANALYSIS_USER_PROMPT,
  REFERRAL_GENERATION_SYSTEM_INSTRUCTION,
  REFERRAL_GENERATION_USER_PROMPT,
} from "../prompts";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    console.log(`[PrepOps AI] Using Gemini model: ${this.modelName}`);
  }

  async analyzeJob(jobText: string, resumeText?: string): Promise<JobSummaryResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: JOB_ANALYSIS_SYSTEM_INSTRUCTION,
    });

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        roleTitle: { type: SchemaType.STRING },
        companyName: { type: SchemaType.STRING },
        location: { type: SchemaType.STRING },
        salary: { type: SchemaType.STRING },
        employmentType: {
          type: SchemaType.STRING,
          enum: ["FULL_TIME", "CONTRACT", "INTERN", "Not specified"],
          format: "enum",
        },
        workModel: {
          type: SchemaType.STRING,
          enum: ["REMOTE", "HYBRID", "ON_SITE", "Not specified"],
          format: "enum",
        },
        experienceLevel: { type: SchemaType.STRING },
        requiredSkills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        preferredSkills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        responsibilities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        qualifications: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        applicationDecision: {
          type: SchemaType.STRING,
          enum: ["APPLY_NOW", "APPLY_AFTER_PREP", "SKIP"],
          format: "enum",
        },
        prepDifficulty: {
          type: SchemaType.STRING,
          enum: ["LOW", "MEDIUM", "HIGH"],
          format: "enum",
        },
        aiMatchScore: { type: SchemaType.INTEGER },
        aiRecommendationReason: { type: SchemaType.STRING },
      },
      required: [
        "roleTitle",
        "companyName",
        "location",
        "salary",
        "employmentType",
        "workModel",
        "experienceLevel",
        "requiredSkills",
        "preferredSkills",
        "responsibilities",
        "qualifications",
        "applicationDecision",
        "prepDifficulty",
        "aiMatchScore",
        "aiRecommendationReason",
      ],
    };

    const userPrompt = JOB_ANALYSIS_USER_PROMPT(jobText, resumeText);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("Empty response received from Gemini API.");
    }

    try {
      return JSON.parse(responseText) as JobSummaryResult;
    } catch (error) {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      throw new Error(`Invalid JSON output from AI model: ${error}`);
    }
  }

  async generateReferral(params: ReferralRequestParams): Promise<ReferralResponseResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: REFERRAL_GENERATION_SYSTEM_INSTRUCTION,
    });

    const userPrompt = REFERRAL_GENERATION_USER_PROMPT(
      params.resumeContent,
      params.jobTitle,
      params.companyName,
      params.contactName,
      params.channel,
      params.jobDescription
    );

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    const message = result.response.text().trim();
    return { message };
  }
}

