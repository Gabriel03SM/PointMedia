-- CreateTable
CREATE TABLE "ScreeningConfiguration" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "skillsWeight" INTEGER NOT NULL,
    "seniorityWeight" INTEGER NOT NULL,
    "salaryWeight" INTEGER NOT NULL,
    "mandatorySkillsShare" INTEGER NOT NULL,
    "requireCompleteData" BOOLEAN NOT NULL DEFAULT false,
    "algorithmVersion" VARCHAR(40) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningRun" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "jobVersion" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sourceHash" CHAR(64) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningResult" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "score" DECIMAL(5,2),
    "coverage" DECIMAL(5,2) NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL,
    "evaluation" JSONB NOT NULL,

    CONSTRAINT "ScreeningResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningConfiguration_jobId_version_key" ON "ScreeningConfiguration"("jobId", "version");

-- CreateIndex
CREATE INDEX "ScreeningRun_jobId_createdAt_idx" ON "ScreeningRun"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningRun_jobId_sequence_key" ON "ScreeningRun"("jobId", "sequence");

-- CreateIndex
CREATE INDEX "ScreeningResult_runId_score_coverage_idx" ON "ScreeningResult"("runId", "score", "coverage");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningResult_runId_applicationId_key" ON "ScreeningResult"("runId", "applicationId");

-- AddForeignKey
ALTER TABLE "ScreeningConfiguration" ADD CONSTRAINT "ScreeningConfiguration_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningConfiguration" ADD CONSTRAINT "ScreeningConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "ScreeningConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ScreeningRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScreeningConfiguration" ADD CONSTRAINT "ScreeningConfiguration_weights" CHECK (
  "skillsWeight" BETWEEN 0 AND 100 AND "seniorityWeight" BETWEEN 0 AND 100 AND "salaryWeight" BETWEEN 0 AND 100
  AND "skillsWeight" + "seniorityWeight" + "salaryWeight" = 100
  AND "mandatorySkillsShare" BETWEEN 0 AND 100 AND "version" >= 1
);
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_versions" CHECK ("jobVersion" >= 1 AND "sequence" >= 1);
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_ranges" CHECK (
  ("score" IS NULL OR "score" BETWEEN 0 AND 100) AND "coverage" BETWEEN 0 AND 100 AND "profileVersion" >= 1
);
