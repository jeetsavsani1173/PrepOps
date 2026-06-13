export interface JobSummaryResult {
  roleTitle: string;
  companyName: string;
  location: string;
  salary: string;
  employmentType: "FULL_TIME" | "CONTRACT" | "INTERN" | "Not specified";
  workModel: "REMOTE" | "HYBRID" | "ON_SITE" | "Not specified";
  experienceLevel: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  applicationDecision: "APPLY_NOW" | "APPLY_AFTER_PREP" | "SKIP";
  prepDifficulty: "LOW" | "MEDIUM" | "HIGH";
  aiMatchScore: number;
  aiRecommendationReason: string;
}

export interface ReferralRequestParams {
  resumeContent: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  contactName: string;
  channel: "LINKEDIN" | "EMAIL" | "OTHER";
}

export interface ReferralResponseResult {
  message: string;
}
