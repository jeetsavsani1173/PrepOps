import { JobSummaryResult, ReferralRequestParams, ReferralResponseResult } from "../types";

export interface LLMProvider {
  name: string;
  analyzeJob(jobText: string, resumeText?: string): Promise<JobSummaryResult>;
  generateReferral(params: ReferralRequestParams): Promise<ReferralResponseResult>;
}
