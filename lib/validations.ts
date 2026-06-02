import { z } from "zod";

const statusEnum = z.enum([
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "BETTER_LUCK_NEXT_TIME",
]);

const referralChannelEnum = z.enum(["LINKEDIN", "EMAIL", "OTHER"]);
const referralStatusEnum = z.enum([
  "PLANNED",
  "REQUESTED",
  "FOLLOWED_UP",
  "RESPONDED",
  "REFERRED",
  "DECLINED",
  "CLOSED",
]);

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().url().optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().email().optional(),
);

const optionalDateSchema = z.preprocess((value) => {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : new Date(trimmed);
  }
  return value;
}, z.date().nullable().optional());

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

export const createReferralSchema = z.object({
  contactName: z.string().trim().min(1),
  contactTitle: z.string().trim().optional(),
  contactCompany: z.string().trim().optional(),
  contactUrl: optionalUrlSchema,
  contactEmail: optionalEmailSchema,
  channel: referralChannelEnum,
  status: referralStatusEnum.default("PLANNED"),
  initialMessage: z.string().trim().optional(),
  lastMessage: z.string().trim().optional(),
  nextFollowUpAt: optionalDateSchema,
  notes: z.string().trim().optional(),
});

export const updateReferralSchema = createReferralSchema.partial().extend({
  status: referralStatusEnum.optional(),
});

export const createReferralFollowUpSchema = z.object({
  message: z.string().trim().min(1),
  sentAt: optionalDateSchema,
  nextFollowUpAt: optionalDateSchema,
});
