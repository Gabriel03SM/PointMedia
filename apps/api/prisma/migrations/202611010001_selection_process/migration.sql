ALTER TYPE "ApplicationStatus" ADD VALUE 'SCREENING';
ALTER TYPE "ApplicationStatus" ADD VALUE 'SHORTLISTED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'REJECTED';

ALTER TABLE "Application" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Application" ADD CONSTRAINT "Application_version_positive" CHECK ("version" > 0);
CREATE INDEX "Application_jobId_status_submittedAt_idx" ON "Application"("jobId", "status", "submittedAt");

CREATE TABLE "ApplicationStageHistory" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "version" INTEGER NOT NULL,
  "publicMessage" VARCHAR(2000),
  "internalReason" VARCHAR(2000),
  "actorId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStageHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationStageHistory_version_positive" CHECK ("version" > 0),
  CONSTRAINT "ApplicationStageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationStageHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApplicationStageHistory_applicationId_version_key" ON "ApplicationStageHistory"("applicationId", "version");

-- Preserva a data e a autoria de recebimento das candidaturas existentes.
INSERT INTO "ApplicationStageHistory" ("id", "applicationId", "toStatus", "version", "actorId", "createdAt")
SELECT gen_random_uuid(), "id", "status", 1, "userId", "submittedAt" FROM "Application";

CREATE TABLE "RecruiterNote" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "actorId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruiterNote_body_not_blank" CHECK (length(btrim("body")) > 0),
  CONSTRAINT "RecruiterNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruiterNote_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RecruiterNote_applicationId_createdAt_idx" ON "RecruiterNote"("applicationId", "createdAt");
