-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "jobUrl" TEXT,
    "location" TEXT,
    "salary" TEXT,
    "jobDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "retentionDays" INTEGER NOT NULL DEFAULT 14,
    "aiMatchScore" INTEGER,
    "scrapedRawText" TEXT,
    "scrapedHtml" TEXT,
    "employmentType" TEXT,
    "workModel" TEXT,
    "experienceLevel" TEXT,
    "requiredSkills" TEXT,
    "preferredSkills" TEXT,
    "responsibilities" TEXT,
    "qualifications" TEXT,
    "applicationDecision" TEXT,
    "prepDifficulty" TEXT,
    "aiRecommendationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Opportunity" ("aiMatchScore", "aiRecommendationReason", "applicationDecision", "companyName", "createdAt", "employmentType", "experienceLevel", "id", "jobDescription", "jobUrl", "location", "preferredSkills", "prepDifficulty", "qualifications", "requiredSkills", "responsibilities", "roleTitle", "salary", "scrapedHtml", "scrapedRawText", "source", "status", "updatedAt", "workModel") SELECT "aiMatchScore", "aiRecommendationReason", "applicationDecision", "companyName", "createdAt", "employmentType", "experienceLevel", "id", "jobDescription", "jobUrl", "location", "preferredSkills", "prepDifficulty", "qualifications", "requiredSkills", "responsibilities", "roleTitle", "salary", "scrapedHtml", "scrapedRawText", "source", "status", "updatedAt", "workModel" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");
CREATE INDEX "Opportunity_jobUrl_idx" ON "Opportunity"("jobUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
