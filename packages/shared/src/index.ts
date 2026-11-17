export type Role = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: Role;
  passwordChangedAt: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  requestId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
  profile: ProfessionalInput;
  application?: ApplicationInput;
  talentConsentVersion?: string;
}
export interface RegistrationResult {
  user: CurrentUser;
  result: ApplicationResult;
}
export interface UpdateAccountInput {
  name: string;
  email: string;
  phone?: string | null;
}
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const SENIORITIES = ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const;
export type Seniority = (typeof SENIORITIES)[number];
export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const PROFILE_FIELDS = [
  'LOCATION',
  'SENIORITY',
  'SALARY',
  'LINKEDIN',
  'PORTFOLIO',
  'SKILLS',
  'EXPERIENCE',
  'EDUCATION',
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface JobInput {
  title: string;
  description: string;
  department?: string;
  workMode: WorkMode;
  seniority?: Seniority | null;
  seniorityNotApplicable: boolean;
  location?: string | null;
  locationNotApplicable: boolean;
  salaryMin?: string | null;
  salaryMax?: string | null;
  salaryNotApplicable: boolean;
  closesAt: string;
  requiredSkills: string[];
  desiredSkills: string[];
}
export interface Job extends JobInput {
  id: string;
  version: number;
  status: JobStatus;
  effectiveStatus: JobStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ExperienceInput {
  company: string;
  position: string;
  startedMonth: string;
  endedMonth?: string | null;
  description: string;
}
export interface EducationInput {
  institution: string;
  course: string;
  startedYear: number;
  finishedYear?: number | null;
}
export interface ProfessionalInput {
  version: number;
  name: string;
  phone?: string | null;
  headline: string;
  location?: string | null;
  seniority?: Seniority | null;
  expectedSalary?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  about: string;
  skills: string[];
  experience: ExperienceInput[];
  education: EducationInput[];
  notApplicable: ProfileField[];
  shareWithRecruiters: boolean;
}
export interface ResumeInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
export interface ProfessionalProfile extends ProfessionalInput {
  userId: string;
  email: string;
  updatedAt: string;
  resume: ResumeInfo | null;
}

export const PROCESS_CONSENT_VERSION = 'application-2026-10-29';
export const PROCESS_CONSENT_TEXT =
  'Autorizo disponibilizar meus dados profissionais e currículo à equipe da Point Media para participação nesta vaga.';
export const TALENT_CONSENT_VERSION = 'talent-2026-10-29';
export const TALENT_CONSENT_TEXT =
  'Quero participar do banco de talentos e autorizo a equipe da Point Media a consultar meu perfil e currículo para futuras oportunidades durante o prazo informado. Posso sair pelo portal do candidato a qualquer momento.';

export interface TalentConsentInfo {
  id: string;
  consentVersion: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}
export interface TalentMembership {
  active: boolean;
  consent: TalentConsentInfo | null;
  retentionDays: number;
}
export const APPLICATION_STATUSES = [
  'RECEIVED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'APPROVED',
  'REJECTED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  RECEIVED: 'Recebida',
  SCREENING: 'Em triagem',
  SHORTLISTED: 'Pré-selecionada',
  INTERVIEW: 'Entrevista',
  APPROVED: 'Aprovada',
  REJECTED: 'Reprovada',
};
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  RECEIVED: ['SCREENING', 'REJECTED'],
  SCREENING: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};
export interface ApplicationInfo {
  id: string;
  status: ApplicationStatus;
  version: number;
  submittedAt: string;
  job: { id: string; title: string; effectiveStatus: JobStatus; workMode: WorkMode };
}
export interface ApplicationInput {
  jobId: string;
  processConsent: boolean;
  processConsentVersion: string;
  talentPoolConsent: boolean;
  talentConsentVersion?: string;
}
export interface ApplicationResult {
  outcome: 'APPLICATION' | 'TALENT_POOL';
  application: ApplicationInfo | null;
  talentConsent: TalentConsentInfo | null;
}
export interface ManagementApplication extends ApplicationInfo {
  candidate: { userId: string; name: string; headline: string | null };
}
export interface ApplicationProcess extends ManagementApplication {
  allowedTransitions: readonly ApplicationStatus[];
}
export interface ApplicationStageEvent {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  version: number;
  createdAt: string;
  publicMessage: string | null;
}
export interface InternalStageEvent extends ApplicationStageEvent {
  internalReason: string | null;
  actor: { id: string; name: string } | null;
}
export interface RecruiterNote {
  id: string;
  body: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
}
export interface ApplicationTransitionInput {
  version: number;
  status: ApplicationStatus;
  internalReason: string;
  publicMessage?: string;
}

export interface MetricPeriod {
  days: number;
  since: string;
  until: string;
  timeZone: 'America/Sao_Paulo';
}
export interface MetricDay {
  date: string;
  count: number;
}
export interface CompatibilityMetrics {
  runId: string;
  generatedAt: string;
  stale: boolean;
  averageScore: number | null;
  total: number;
  withoutScore: number;
  bands: { label: string; count: number }[];
}
export interface RecruitmentMetrics {
  period: MetricPeriod;
  jobId: string | null;
  profiles: { available: number; month: number; talent: number };
  openJobs: number;
  applications: number;
  seniority: { seniority: Seniority | null; count: number }[];
  stages: { status: ApplicationStatus; count: number }[];
  funnel: { status: ApplicationStatus; count: number }[];
  daily: MetricDay[];
  conversion: number | null;
  triage: { averageHours: number | null; sample: number };
  compatibility: CompatibilityMetrics | null;
}
export interface AdministrationMetrics {
  period: MetricPeriod;
  activeUsers: number;
  newUsers: number;
  trackedJobs: number;
  auditEvents: number;
  roles: { role: Role; total: number; active: number }[];
  daily: MetricDay[];
  actions: { action: string; count: number }[];
}
export interface IntelligenceStatus {
  available: boolean;
  provider: string | null;
  reason: string | null;
}

export const SCREENING_ALGORITHM_VERSION = 'declared-v1';
export interface ScreeningSettings {
  skillsWeight: number;
  seniorityWeight: number;
  salaryWeight: number;
  mandatorySkillsShare: number;
  requireCompleteData: boolean;
}
export const DEFAULT_SCREENING_SETTINGS: ScreeningSettings = {
  skillsWeight: 50,
  seniorityWeight: 30,
  salaryWeight: 20,
  mandatorySkillsShare: 70,
  requireCompleteData: false,
};
export interface ScreeningConfiguration extends ScreeningSettings {
  id: string;
  jobId: string;
  version: number;
  algorithmVersion: string;
  createdAt: string;
}
export interface ScreeningConfigurationState {
  configuration: ScreeningConfiguration | null;
  defaults: ScreeningSettings;
  jobVersion: number;
}
export interface ScreeningCriterion {
  key: 'SKILLS' | 'SENIORITY' | 'SALARY';
  status: 'EVALUATED' | 'NOT_INFORMED' | 'NOT_APPLICABLE';
  weight: number;
  score: number | null;
  contribution: number | null;
  explanation: string;
  notes: string[];
}
export interface ScreeningEvaluation {
  score: number | null;
  coverage: number;
  reviewRequired: boolean;
  reviewReasons: string[];
  criteria: ScreeningCriterion[];
}
export interface ScreeningRunInfo {
  id: string;
  sequence: number;
  configurationVersion: number;
  algorithmVersion: string;
  jobVersion: number;
  createdAt: string;
  evaluatedCount: number;
  reviewRequiredCount: number;
  withoutScoreCount: number;
}
export interface RankedCandidate extends ScreeningEvaluation {
  applicationId: string;
  submittedAt: string;
  profileVersion: number;
  candidate: { userId: string; name: string; headline: string };
}
export interface ScreeningRanking extends PageResult<RankedCandidate> {
  configuration: ScreeningConfiguration | null;
  run: ScreeningRunInfo | null;
  stale: boolean;
  applicationsCount: number;
  unavailableProfiles: number;
}
