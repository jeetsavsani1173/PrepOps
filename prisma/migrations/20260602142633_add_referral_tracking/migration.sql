-- CreateTable
CREATE TABLE "ReferralRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactTitle" TEXT,
    "contactCompany" TEXT,
    "contactUrl" TEXT,
    "contactEmail" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "initialMessage" TEXT,
    "lastMessage" TEXT,
    "nextFollowUpAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReferralRequest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralRequestId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUpAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralFollowUp_referralRequestId_fkey" FOREIGN KEY ("referralRequestId") REFERENCES "ReferralRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReferralRequest_opportunityId_idx" ON "ReferralRequest"("opportunityId");

-- CreateIndex
CREATE INDEX "ReferralRequest_status_idx" ON "ReferralRequest"("status");

-- CreateIndex
CREATE INDEX "ReferralRequest_nextFollowUpAt_idx" ON "ReferralRequest"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "ReferralFollowUp_referralRequestId_idx" ON "ReferralFollowUp"("referralRequestId");

-- CreateIndex
CREATE INDEX "ReferralFollowUp_sentAt_idx" ON "ReferralFollowUp"("sentAt");
