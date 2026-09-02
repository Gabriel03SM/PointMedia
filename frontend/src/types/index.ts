export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export type Seniority = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'SPECIALIST';

export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export type RequirementType = 'REQUIRED' | 'DIFFERENTIAL';

export type ApplicationStatus = 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'HIRED' | 'ARCHIVED';

export type EvaluationDecision = 'APPROVE' | 'REJECT' | 'HOLD';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface JobRequirement {
  id?: string;
  description: string;
  type: RequirementType;
  weight: number;
}

export interface JobSkill {
  id?: string;
  skillId?: string;
  skillName?: string;
  name?: string;
  skill?: { id: string; name: string };
  isRequired: boolean;
  weight: number;
}

export interface SelectionStage {
  id: string;
  name: string;
  order: number;
  isDefault?: boolean;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  seniority: Seniority;
  description: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  deadline: string;
  status: JobStatus;
  skillsWeight: number;
  seniorityWeight: number;
  salaryWeight: number;
  differentialsWeight: number;
  requirements?: JobRequirement[];
  skills?: JobSkill[];
  stages?: SelectionStage[];
  _count?: {
    applications: number;
  };
  createdAt?: string;
}

export interface CandidateSkill {
  id?: string;
  skillId?: string;
  name?: string;
  skill?: { id: string; name: string };
  level?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  seniority?: Seniority;
  expectedSalary?: number;
  bio?: string;
  skills?: CandidateSkill[];
}

export interface ApplicationStageHistory {
  id: string;
  stage: { id: string; name: string };
  changedAt: string;
  note?: string;
}

export interface Evaluation {
  id: string;
  decision: EvaluationDecision;
  notes: string;
  createdAt: string;
  author?: { email: string };
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  score: number;
  requiredCriteriaMet: boolean;
  currentStageId?: string;
  status: ApplicationStatus;
  createdAt: string;
  candidate: Candidate;
  job: Job;
  currentStage?: SelectionStage;
  stageHistories?: ApplicationStageHistory[];
  evaluations?: Evaluation[];
}

export interface ScoreBreakdown {
  skillsScore: number;
  seniorityScore: number;
  salaryScore: number;
  differentialsScore: number;
}

export interface RankingCandidate {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  seniority?: Seniority;
  expectedSalary?: number;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  score: number;
  requiredCriteriaMet: boolean;
  currentStage: {
    id: string;
    name: string;
    order: number;
  };
  status: ApplicationStatus;
  appliedAt: string;
  breakdown?: ScoreBreakdown;
}

export interface DashboardSummary {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  activeApplications: number;
  hiredCount: number;
  pipelineByStage: {
    stageName: string;
    count: number;
  }[];
  recentApplications: {
    id: string;
    candidateName: string;
    jobTitle: string;
    score: number;
    stageName: string;
    status: ApplicationStatus;
    appliedAt: string;
  }[];
}
