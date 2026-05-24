-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "jobUrl" TEXT,
    "location" TEXT,
    "salary" TEXT,
    "jobDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
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

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "questions" TEXT,
    "feedback" TEXT,
    "learnings" TEXT,
    "followUps" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterviewNote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrepTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrepTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResumeSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "extractedSkillsText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_opportunityId_idx" ON "StatusHistory"("opportunityId");

-- CreateIndex
CREATE INDEX "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX "InterviewNote_opportunityId_idx" ON "InterviewNote"("opportunityId");

-- CreateIndex
CREATE INDEX "PrepTask_opportunityId_idx" ON "PrepTask"("opportunityId");

-- CreateIndex
CREATE INDEX "PrepTask_isCompleted_idx" ON "PrepTask"("isCompleted");
