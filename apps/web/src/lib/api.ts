import type {
  CurrentUser,
  LoginInput,
  UpdateAccountInput,
  ChangePasswordInput,
  ApiError,
  RegisterInput,
  RegistrationResult,
  Job,
  JobInput,
  JobStatus,
  PageResult,
  ProfessionalInput,
  ProfessionalProfile,
  ResumeInfo,
  ApplicationInfo,
  ApplicationInput,
  ApplicationResult,
  ManagementApplication,
  ApplicationProcess,
  ApplicationStageEvent,
  InternalStageEvent,
  RecruiterNote,
  ApplicationTransitionInput,
  RecruitmentMetrics,
  AdministrationMetrics,
  IntelligenceStatus,
  TalentMembership,
  ScreeningSettings,
  ScreeningConfigurationState,
  ScreeningRunInfo,
  ScreeningRanking,
} from '@pointmedia/shared';

export class ApiFailure extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        'X-Pointmedia-Request': '1',
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiFailure(0, 'Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    const message = body?.message;
    throw new ApiFailure(
      response.status,
      Array.isArray(message)
        ? message.join(' ')
        : typeof message === 'string'
          ? message
          : 'Não foi possível concluir a operação.',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  recruitmentMetrics: (query: string, signal?: AbortSignal) =>
    request<RecruitmentMetrics>(`/analytics/recruitment?${query}`, { signal }),
  administrationMetrics: (days: number, signal?: AbortSignal) =>
    request<AdministrationMetrics>(`/analytics/administration?days=${days}`, { signal }),
  intelligenceStatus: (signal?: AbortSignal) =>
    request<IntelligenceStatus>('/intelligence/status', { signal }),
  register: (input: RegisterInput, file?: File) => {
    if (!file)
      return request<RegistrationResult>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ data: input }),
      });
    const body = new FormData();
    body.append('data', JSON.stringify(input));
    body.append('file', file);
    return request<RegistrationResult>('/auth/register', { method: 'POST', body });
  },
  me: (signal?: AbortSignal) => request<CurrentUser>('/users/me', { signal }),
  login: (input: LoginInput) =>
    request<CurrentUser>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<void>('/auth/logout', { method: 'POST', body: '{}' }),
  updateAccount: (input: UpdateAccountInput) =>
    request<CurrentUser>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
  changePassword: (input: ChangePasswordInput) =>
    request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }),
  publicJobs: (query = '', signal?: AbortSignal) =>
    request<PageResult<Job>>(`/jobs${query ? `?${query}` : ''}`, { signal }),
  publicJob: (id: string, signal?: AbortSignal) =>
    request<Job>(`/jobs/${encodeURIComponent(id)}`, { signal }),
  jobs: (query = '', signal?: AbortSignal) =>
    request<PageResult<Job>>(`/management/jobs${query ? `?${query}` : ''}`, { signal }),
  job: (id: string, signal?: AbortSignal) =>
    request<Job>(`/management/jobs/${encodeURIComponent(id)}`, { signal }),
  createJob: (input: JobInput) =>
    request<Job>('/management/jobs', { method: 'POST', body: JSON.stringify(input) }),
  updateJob: (id: string, input: JobInput & { version: number }) =>
    request<Job>(`/management/jobs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  jobStatus: (job: Job, status: Exclude<JobStatus, 'DRAFT'>) =>
    request<Job>(`/management/jobs/${job.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ version: job.version, status }),
    }),
  profile: (signal?: AbortSignal) =>
    request<{ profile: ProfessionalProfile | null }>('/candidates/me/profile', { signal }).then(
      (result) => result.profile,
    ),
  saveProfile: (input: ProfessionalInput) =>
    request<ProfessionalProfile>('/candidates/me/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  removeProfile: (version: number) =>
    request<void>('/candidates/me/profile', {
      method: 'DELETE',
      body: JSON.stringify({ version }),
    }),
  uploadResume: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<ResumeInfo>('/candidates/me/resume', { method: 'POST', body });
  },
  removeResume: () => request<void>('/candidates/me/resume', { method: 'DELETE' }),
  candidates: (query = '', signal?: AbortSignal) =>
    request<PageResult<ProfessionalProfile>>(`/candidates${query ? `?${query}` : ''}`, { signal }),
  candidate: (id: string, signal?: AbortSignal) =>
    request<ProfessionalProfile>(`/candidates/${encodeURIComponent(id)}/profile`, { signal }),
  apply: (input: ApplicationInput) =>
    request<ApplicationResult>('/applications', { method: 'POST', body: JSON.stringify(input) }),
  applications: (query = '', signal?: AbortSignal) =>
    request<PageResult<ApplicationInfo>>(`/applications/me${query ? `?${query}` : ''}`, { signal }),
  application: (id: string, signal?: AbortSignal) =>
    request<ApplicationInfo>(`/applications/me/${encodeURIComponent(id)}`, { signal }),
  managementApplications: (query = '', signal?: AbortSignal) =>
    request<PageResult<ManagementApplication>>(
      `/management/applications${query ? `?${query}` : ''}`,
      { signal },
    ),
  applicationProfile: (id: string, signal?: AbortSignal) =>
    request<ProfessionalProfile>(`/management/applications/${encodeURIComponent(id)}/profile`, {
      signal,
    }),
  applicationProcess: (id: string, signal?: AbortSignal) =>
    request<ApplicationProcess>(`/management/applications/${encodeURIComponent(id)}`, { signal }),
  applicationHistory: (id: string, query: string, internal = false, signal?: AbortSignal) =>
    request<PageResult<ApplicationStageEvent | InternalStageEvent>>(
      `${internal ? '/management/applications' : '/applications/me'}/${encodeURIComponent(id)}/history?${query}`,
      { signal },
    ),
  transitionApplication: (id: string, input: ApplicationTransitionInput) =>
    request<ApplicationProcess>(`/management/applications/${encodeURIComponent(id)}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  applicationNotes: (id: string, query: string, signal?: AbortSignal) =>
    request<PageResult<RecruiterNote>>(
      `/management/applications/${encodeURIComponent(id)}/notes?${query}`,
      { signal },
    ),
  addApplicationNote: (id: string, body: string) =>
    request<RecruiterNote>(`/management/applications/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  talentPolicy: (signal?: AbortSignal) =>
    request<{ retentionDays: number; text: string; consentVersion: string }>(
      '/talent-pool/policy',
      { signal },
    ),
  talentMembership: (signal?: AbortSignal) =>
    request<TalentMembership>('/talent-pool/me', { signal }),
  joinTalentPool: (consentVersion: string) =>
    request<TalentMembership>('/talent-pool/me', {
      method: 'PUT',
      body: JSON.stringify({ consent: true, consentVersion }),
    }),
  leaveTalentPool: () => request<void>('/talent-pool/me', { method: 'DELETE' }),
  talents: (query = '', signal?: AbortSignal) =>
    request<PageResult<ProfessionalProfile>>(`/talent-pool${query ? `?${query}` : ''}`, { signal }),
  talent: (id: string, signal?: AbortSignal) =>
    request<ProfessionalProfile>(`/talent-pool/${encodeURIComponent(id)}/profile`, { signal }),
  screeningConfiguration: (id: string, signal?: AbortSignal) =>
    request<ScreeningConfigurationState>(
      `/screening/jobs/${encodeURIComponent(id)}/configuration`,
      { signal },
    ),
  saveScreeningConfiguration: (id: string, input: ScreeningSettings & { version: number }) =>
    request<ScreeningConfigurationState>(
      `/screening/jobs/${encodeURIComponent(id)}/configuration`,
      { method: 'PUT', body: JSON.stringify(input) },
    ),
  generateScreening: (id: string, configurationVersion: number, jobVersion: number) =>
    request<ScreeningRunInfo>(`/screening/jobs/${encodeURIComponent(id)}/runs`, {
      method: 'POST',
      body: JSON.stringify({ configurationVersion, jobVersion }),
    }),
  screeningRanking: (id: string, query = '', signal?: AbortSignal) =>
    request<ScreeningRanking>(
      `/screening/jobs/${encodeURIComponent(id)}/ranking${query ? `?${query}` : ''}`,
      { signal },
    ),
};
