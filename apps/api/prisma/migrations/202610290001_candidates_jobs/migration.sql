-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProfileField" AS ENUM ('LOCATION', 'SENIORITY', 'SALARY', 'LINKEDIN', 'PORTFOLIO', 'SKILLS', 'EXPERIENCE', 'EDUCATION');

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "userId" UUID NOT NULL,
    "headline" VARCHAR(120) NOT NULL,
    "location" VARCHAR(160),
    "seniority" "Seniority",
    "expectedSalary" DECIMAL(12,2),
    "linkedin" VARCHAR(500),
    "portfolio" VARCHAR(500),
    "about" VARCHAR(5000) NOT NULL,
    "notApplicable" "ProfileField"[] DEFAULT ARRAY[]::"ProfileField"[],
    "recruitmentConsentAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "userId" UUID NOT NULL,
    "skillId" UUID NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "ProfessionalExperience" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "company" VARCHAR(160) NOT NULL,
    "position" VARCHAR(160) NOT NULL,
    "startedMonth" VARCHAR(7) NOT NULL,
    "endedMonth" VARCHAR(7),
    "description" VARCHAR(2000) NOT NULL,
    "positionIndex" INTEGER NOT NULL,

    CONSTRAINT "ProfessionalExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "institution" VARCHAR(160) NOT NULL,
    "course" VARCHAR(160) NOT NULL,
    "startedYear" INTEGER NOT NULL,
    "finishedYear" INTEGER,
    "positionIndex" INTEGER NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeFile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "storageKey" UUID NOT NULL,
    "originalName" VARCHAR(180) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpening" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(12000) NOT NULL,
    "department" VARCHAR(120),
    "workMode" "WorkMode" NOT NULL,
    "seniority" "Seniority",
    "seniorityNotApplicable" BOOLEAN NOT NULL,
    "location" VARCHAR(160),
    "locationNotApplicable" BOOLEAN NOT NULL,
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "salaryNotApplicable" BOOLEAN NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "closesAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" UUID,

    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "mandatory" BOOLEAN NOT NULL,
    "positionIndex" INTEGER NOT NULL,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateProfile_recruitmentConsentAt_updatedAt_idx" ON "CandidateProfile"("recruitmentConsentAt", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_normalizedName_key" ON "Skill"("normalizedName");

-- CreateIndex
CREATE INDEX "ProfessionalExperience_userId_positionIndex_idx" ON "ProfessionalExperience"("userId", "positionIndex");

-- CreateIndex
CREATE INDEX "Education_userId_positionIndex_idx" ON "Education"("userId", "positionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeFile_userId_key" ON "ResumeFile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeFile_storageKey_key" ON "ResumeFile"("storageKey");

-- CreateIndex
CREATE INDEX "JobOpening_status_closesAt_publishedAt_idx" ON "JobOpening"("status", "closesAt", "publishedAt");

-- CreateIndex
CREATE INDEX "JobOpening_createdById_idx" ON "JobOpening"("createdById");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_positionIndex_idx" ON "JobRequirement"("jobId", "positionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "JobRequirement_jobId_normalizedName_key" ON "JobRequirement"("jobId", "normalizedName");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CandidateProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalExperience" ADD CONSTRAINT "ProfessionalExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CandidateProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CandidateProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeFile" ADD CONSTRAINT "ResumeFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Regras de consistência adicionais às relações geradas pelo Prisma.
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_salary_nonnegative"
  CHECK ("expectedSalary" IS NULL OR "expectedSalary" >= 0);
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_version_positive" CHECK ("version" >= 1);
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_salary_choice" CHECK (
  ("salaryNotApplicable" AND "salaryMin" IS NULL AND "salaryMax" IS NULL) OR
  (NOT "salaryNotApplicable" AND "salaryMin" IS NOT NULL AND "salaryMax" IS NOT NULL AND "salaryMin" >= 0 AND "salaryMax" >= "salaryMin")
);
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_seniority_choice" CHECK ("seniorityNotApplicable" = ("seniority" IS NULL));
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_location_choice" CHECK ("locationNotApplicable" = ("location" IS NULL));
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_version_positive" CHECK ("version" >= 1);
ALTER TABLE "ResumeFile" ADD CONSTRAINT "ResumeFile_size_limit" CHECK ("size" > 0 AND "size" <= 5242880);
ALTER TABLE "ProfessionalExperience" ADD CONSTRAINT "ProfessionalExperience_dates" CHECK ("endedMonth" IS NULL OR "endedMonth" >= "startedMonth");
ALTER TABLE "Education" ADD CONSTRAINT "Education_dates" CHECK ("finishedYear" IS NULL OR "finishedYear" >= "startedYear");
