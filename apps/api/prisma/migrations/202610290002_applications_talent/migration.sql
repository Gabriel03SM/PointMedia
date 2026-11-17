-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('RECEIVED');

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'RECEIVED',
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizationVersion" VARCHAR(40) NOT NULL,
    "profileVersion" INTEGER NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentConsent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "consentVersion" VARCHAR(40) NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TalentConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_jobId_submittedAt_idx" ON "Application"("jobId", "submittedAt");

-- CreateIndex
CREATE INDEX "Application_userId_submittedAt_idx" ON "Application"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_jobId_key" ON "Application"("userId", "jobId");

-- CreateIndex
CREATE INDEX "TalentConsent_userId_revokedAt_expiresAt_idx" ON "TalentConsent"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "TalentConsent_revokedAt_expiresAt_idx" ON "TalentConsent"("revokedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentConsent" ADD CONSTRAINT "TalentConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Uma autorização vigente por pessoa; novas concessões preservam o registro anterior revogado.
CREATE UNIQUE INDEX "TalentConsent_unrevoked_user_key" ON "TalentConsent"("userId") WHERE "revokedAt" IS NULL;
ALTER TABLE "TalentConsent" ADD CONSTRAINT "TalentConsent_dates" CHECK ("expiresAt" > "grantedAt" AND ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt"));
ALTER TABLE "Application" ADD CONSTRAINT "Application_profile_version" CHECK ("profileVersion" >= 1);
