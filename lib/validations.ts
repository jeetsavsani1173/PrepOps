import { z } from "zod";

const statusEnum = z.enum([
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "BETTER_LUCK_NEXT_TIME",
]);

export const createOpportunitySchema = z.object({
  companyName: z.string().trim().min(1),
  roleTitle: z.string().trim().min(1),
  source: z.string().trim().min(1).default("MANUAL"),
  jobUrl: z.string().url().optional(),
  location: z.string().trim().optional(),
  salary: z.string().trim().optional(),
  jobDescription: z.string().trim().optional(),
  status: statusEnum.optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  status: statusEnum.optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

export const scrapeJobSchema = z.object({
  url: z.string().url(),
  opportunityId: z.string().uuid().optional(),
});

export const extensionIngestSchema = z.object({
  url: z.string().url(),
  companyName: z.string().trim().min(1),
  roleTitle: z.string().trim().optional(),
  rawHtml: z.string().optional(),
  pageText: z.string().optional(),
  source: z.string().default("EXTENSION"),
});
