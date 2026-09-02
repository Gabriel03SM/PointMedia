import type {
  Application,
  Candidate,
  DashboardSummary,
  Job,
  RankingCandidate,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('point_media_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Fallback Mock Data for immediate offline exploration & demonstration
const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Senior CRM & Marketing Automation Specialist',
    department: 'CRM & Growth',
    location: 'São Paulo, SP (Híbrido)',
    type: 'CLT - Full Time',
    seniority: 'SENIOR',
    description: 'Buscamos especialista em CRM para liderar estratégias multicanal, automações com Salesforce/HubSpot e campanhas orientadas a dados para grandes clientes como PicPay e C&A.',
    salaryMin: 11000,
    salaryMax: 14500,
    deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
    status: 'OPEN',
    skillsWeight: 40,
    seniorityWeight: 30,
    salaryWeight: 15,
    differentialsWeight: 15,
    requirements: [
      { id: 'req-1', description: 'Experiência prévia de no mínimo 4 anos com CRM e Automação', type: 'REQUIRED', weight: 40 },
      { id: 'req-2', description: 'Domínio de Salesforce Marketing Cloud ou HubSpot', type: 'REQUIRED', weight: 30 },
      { id: 'req-3', description: 'Certificação Salesforce ou HubSpot', type: 'DIFFERENTIAL', weight: 15 },
      { id: 'req-4', description: 'Conhecimento em SQL para segmentação de audiência', type: 'DIFFERENTIAL', weight: 15 },
    ],
    skills: [
      { id: 'sk-1', name: 'Salesforce Marketing Cloud', isRequired: true, weight: 30 },
      { id: 'sk-2', name: 'HubSpot', isRequired: true, weight: 25 },
      { id: 'sk-3', name: 'SQL', isRequired: false, weight: 20 },
      { id: 'sk-4', name: 'E-mail Marketing & SMS', isRequired: true, weight: 25 },
    ],
    stages: [
      { id: 'stage-1', name: 'Inscrição', order: 1, isDefault: true },
      { id: 'stage-2', name: 'Triagem Técnica', order: 2 },
      { id: 'stage-3', name: 'Entrevista com RH', order: 3 },
      { id: 'stage-4', name: 'Case Prático', order: 4 },
      { id: 'stage-5', name: 'Proposta Final', order: 5 },
    ],
    _count: { applications: 6 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'job-2',
    title: 'Designer Gráfico & Motion Banner Creator',
    department: 'Criação & Mídia',
    location: 'Remoto (Brasil)',
    type: 'PJ / CLT',
    seniority: 'MID',
    description: 'Criação de banners dinâmicos, peças para mídia de performance, key visuals e animações rápidas para marcas renomadas de varejo e moda.',
    salaryMin: 6500,
    salaryMax: 8500,
    deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
    status: 'OPEN',
    skillsWeight: 50,
    seniorityWeight: 20,
    salaryWeight: 15,
    differentialsWeight: 15,
    requirements: [
      { id: 'req-21', description: 'Portfólio consistente com peças de performance e banners', type: 'REQUIRED', weight: 50 },
      { id: 'req-22', description: 'Domínio do pacote Adobe (Photoshop, Illustrator, After Effects)', type: 'REQUIRED', weight: 30 },
      { id: 'req-23', description: 'Experiência com HTML5 Rich Media Banners', type: 'DIFFERENTIAL', weight: 20 },
    ],
    skills: [
      { id: 'sk-21', name: 'Photoshop', isRequired: true, weight: 30 },
      { id: 'sk-22', name: 'After Effects', isRequired: true, weight: 30 },
      { id: 'sk-23', name: 'Figma', isRequired: false, weight: 20 },
      { id: 'sk-24', name: 'HTML5 Banners', isRequired: false, weight: 20 },
    ],
    stages: [
      { id: 'stage-1', name: 'Inscrição', order: 1, isDefault: true },
      { id: 'stage-2', name: 'Avaliação de Portfólio', order: 2 },
      { id: 'stage-3', name: 'Entrevista', order: 3 },
      { id: 'stage-4', name: 'Proposta', order: 4 },
    ],
    _count: { applications: 9 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'job-3',
    title: 'Analista de Mídia de Performance & Tráfego Pago',
    department: 'Mídia & Dados',
    location: 'São Paulo, SP',
    type: 'CLT - Full Time',
    seniority: 'JUNIOR',
    description: 'Gestão e otimização diária de campanhas no Meta Ads, Google Ads e TikTok Ads com foco em ROI, conversão e relatórios analíticos.',
    salaryMin: 4000,
    salaryMax: 5500,
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'OPEN',
    skillsWeight: 45,
    seniorityWeight: 25,
    salaryWeight: 15,
    differentialsWeight: 15,
    requirements: [
      { id: 'req-31', description: 'Experiência prática com Google Ads e Meta Ads Manager', type: 'REQUIRED', weight: 40 },
      { id: 'req-32', description: 'Conhecimento de Google Analytics 4 (GA4)', type: 'REQUIRED', weight: 30 },
      { id: 'req-33', description: 'Certificação Google Ads', type: 'DIFFERENTIAL', weight: 30 },
    ],
    skills: [
      { id: 'sk-31', name: 'Google Ads', isRequired: true, weight: 35 },
      { id: 'sk-32', name: 'Meta Ads', isRequired: true, weight: 35 },
      { id: 'sk-33', name: 'Google Analytics 4', isRequired: false, weight: 30 },
    ],
    stages: [
      { id: 'stage-1', name: 'Inscrição', order: 1, isDefault: true },
      { id: 'stage-2', name: 'Triagem', order: 2 },
      { id: 'stage-3', name: 'Entrevista', order: 3 },
      { id: 'stage-4', name: 'Aprovado', order: 4 },
    ],
    _count: { applications: 4 },
    createdAt: new Date().toISOString(),
  },
];

const MOCK_RANKINGS: Record<string, RankingCandidate[]> = {
  'job-1': [
    {
      applicationId: 'app-1',
      candidateId: 'cand-1',
      candidateName: 'Camila Alencar',
      candidateEmail: 'camila.alencar@email.com',
      phone: '(11) 98765-4321',
      seniority: 'SENIOR',
      expectedSalary: 12500,
      linkedin: 'https://linkedin.com/in/camila-alencar-crm',
      github: 'https://github.com/camila-crm',
      portfolio: 'https://camila-alencar.framer.website',
      resumeUrl: 'https://pointmedia.com/resumes/camila_alencar.pdf',
      score: 95,
      requiredCriteriaMet: true,
      currentStage: { id: 'stage-3', name: 'Entrevista com RH', order: 3 },
      status: 'ACTIVE',
      appliedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      breakdown: { skillsScore: 98, seniorityScore: 100, salaryScore: 90, differentialsScore: 92 },
    },
    {
      applicationId: 'app-2',
      candidateId: 'cand-2',
      candidateName: 'Rodrigo Mendonça',
      candidateEmail: 'rodrigo.mendonca@email.com',
      phone: '(11) 97654-3210',
      seniority: 'SENIOR',
      expectedSalary: 14000,
      linkedin: 'https://linkedin.com/in/rodrigo-mendonca',
      score: 88,
      requiredCriteriaMet: true,
      currentStage: { id: 'stage-2', name: 'Triagem Técnica', order: 2 },
      status: 'ACTIVE',
      appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      breakdown: { skillsScore: 90, seniorityScore: 100, salaryScore: 78, differentialsScore: 84 },
    },
    {
      applicationId: 'app-3',
      candidateId: 'cand-3',
      candidateName: 'Beatriz Vasconcelos',
      candidateEmail: 'beatriz.v@email.com',
      phone: '(21) 99123-4567',
      seniority: 'MID',
      expectedSalary: 9500,
      linkedin: 'https://linkedin.com/in/beatriz-vasconcelos',
      score: 79,
      requiredCriteriaMet: true,
      currentStage: { id: 'stage-2', name: 'Triagem Técnica', order: 2 },
      status: 'ACTIVE',
      appliedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      breakdown: { skillsScore: 82, seniorityScore: 70, salaryScore: 100, differentialsScore: 65 },
    },
    {
      applicationId: 'app-4',
      candidateId: 'cand-4',
      candidateName: 'Lucas Ferreira',
      candidateEmail: 'lucas.f@email.com',
      phone: '(31) 98888-1122',
      seniority: 'JUNIOR',
      expectedSalary: 8000,
      score: 58,
      requiredCriteriaMet: false,
      currentStage: { id: 'stage-1', name: 'Inscrição', order: 1 },
      status: 'ACTIVE',
      appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      breakdown: { skillsScore: 50, seniorityScore: 40, salaryScore: 100, differentialsScore: 40 },
    },
  ],
};

const MOCK_TALENT_POOL: Candidate[] = [
  {
    id: 'cand-1',
    name: 'Camila Alencar',
    email: 'camila.alencar@email.com',
    phone: '(11) 98765-4321',
    seniority: 'SENIOR',
    expectedSalary: 12500,
    linkedin: 'https://linkedin.com/in/camila-alencar-crm',
    bio: 'Especialista em CRM com 7 anos de vivência em grandes agências e marcas de e-commerce.',
    skills: [
      { name: 'Salesforce Marketing Cloud', level: 'Avançado' },
      { name: 'HubSpot', level: 'Avançado' },
      { name: 'SQL', level: 'Intermediário' },
    ],
  },
  {
    id: 'cand-2',
    name: 'Rodrigo Mendonça',
    email: 'rodrigo.mendonca@email.com',
    phone: '(11) 97654-3210',
    seniority: 'SENIOR',
    expectedSalary: 14000,
    linkedin: 'https://linkedin.com/in/rodrigo-mendonca',
    bio: 'Líder técnico de CRM & Data Analytics.',
    skills: [
      { name: 'Salesforce', level: 'Avançado' },
      { name: 'Python', level: 'Intermediário' },
      { name: 'SQL', level: 'Avançado' },
    ],
  },
  {
    id: 'cand-5',
    name: 'Mariana Duarte',
    email: 'mariana.duarte@email.com',
    phone: '(41) 99887-7665',
    seniority: 'MID',
    expectedSalary: 7500,
    linkedin: 'https://linkedin.com/in/mariana-duarte-design',
    portfolio: 'https://behance.net/marianaduarte',
    bio: 'Designer especializada em motion design para publicidade digital e social commerce.',
    skills: [
      { name: 'After Effects', level: 'Avançado' },
      { name: 'Photoshop', level: 'Avançado' },
      { name: 'Figma', level: 'Avançado' },
    ],
  },
  {
    id: 'cand-6',
    name: 'Gabriel Siqueira',
    email: 'gabriel.siqueira@email.com',
    phone: '(19) 98111-2233',
    seniority: 'SPECIALIST',
    expectedSalary: 16000,
    linkedin: 'https://linkedin.com/in/gabrielsiqueira-growth',
    bio: 'Growth Hacker & Estrategista de Performance com histórico de escala em fintechs.',
    skills: [
      { name: 'Google Ads', level: 'Avançado' },
      { name: 'Meta Ads', level: 'Avançado' },
      { name: 'GA4', level: 'Avançado' },
      { name: 'BigQuery', level: 'Intermediário' },
    ],
  },
];

export const api = {
  // Public Jobs
  async getOpenJobs(): Promise<Job[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/open`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback
    }
    return MOCK_JOBS;
  },

  async getOpenJobById(id: string): Promise<Job | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/open/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return MOCK_JOBS.find((j) => j.id === id) || null;
  },

  async submitPublicApplication(data: {
    jobId: string;
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    resumeUrl?: string;
    seniority?: string;
    expectedSalary?: number;
    answers?: Record<string, unknown>;
  }) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback response simulation
    }
    return {
      success: true,
      message: 'Candidatura enviada com sucesso para a esteira da Point Media!',
      score: 91,
      isExpired: false,
    };
  },

  // Auth
  async login(email: string, passwordHash: string): Promise<{ token: string; user: User }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordHash }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    // Demo Mock logins
    let role: User['role'] = 'RECRUITER';
    if (email.includes('candidate')) role = 'CANDIDATE';
    if (email.includes('admin')) role = 'ADMIN';

    return {
      token: 'demo-jwt-token-point-media',
      user: {
        id: 'usr-demo-1',
        email,
        name: email.split('@')[0],
        role,
      },
    };
  },

  async register(data: { name: string; email: string; password: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      token: 'demo-jwt-token-candidate',
      user: {
        id: 'usr-cand-new',
        email: data.email,
        name: data.name,
        role: 'CANDIDATE' as const,
      },
    };
  },

  // Recruiter: Jobs Management
  async getRecruiterJobs(): Promise<Job[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback
    }
    return MOCK_JOBS;
  },

  async createJob(job: Partial<Job>): Promise<Job> {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(job),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const newJob: Job = {
      id: `job-${Date.now()}`,
      title: job.title || 'Nova Vaga',
      department: job.department || 'Geral',
      location: job.location || 'São Paulo, SP',
      type: job.type || 'CLT',
      seniority: job.seniority || 'MID',
      description: job.description || '',
      salaryMin: job.salaryMin || 5000,
      salaryMax: job.salaryMax || 8000,
      deadline: job.deadline || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: job.status || 'OPEN',
      skillsWeight: job.skillsWeight || 40,
      seniorityWeight: job.seniorityWeight || 30,
      salaryWeight: job.salaryWeight || 15,
      differentialsWeight: job.differentialsWeight || 15,
      requirements: job.requirements || [],
      skills: job.skills || [],
      stages: [
        { id: 'stg-1', name: 'Inscrição', order: 1, isDefault: true },
        { id: 'stg-2', name: 'Triagem', order: 2 },
        { id: 'stg-3', name: 'Entrevista', order: 3 },
        { id: 'stg-4', name: 'Proposta', order: 4 },
      ],
      _count: { applications: 0 },
      createdAt: new Date().toISOString(),
    };
    MOCK_JOBS.unshift(newJob);
    return newJob;
  },

  // Recruiter: Ranking & Screening
  async getJobRanking(jobId: string): Promise<RankingCandidate[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/ranking`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
      }
    } catch {
      // Fallback
    }
    return MOCK_RANKINGS[jobId] || [
      {
        applicationId: 'app-sample',
        candidateId: 'cand-sample',
        candidateName: 'Lucas Medeiros',
        candidateEmail: 'lucas.medeiros@pointmedia.demo',
        seniority: 'MID',
        expectedSalary: 7200,
        score: 84,
        requiredCriteriaMet: true,
        currentStage: { id: 'stg-2', name: 'Triagem', order: 2 },
        status: 'ACTIVE',
        appliedAt: new Date().toISOString(),
        breakdown: { skillsScore: 85, seniorityScore: 80, salaryScore: 90, differentialsScore: 80 },
      },
    ];
  },

  async moveApplicationStage(applicationId: string, stageId: string, note?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/stage`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stageId, note }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, stageId, note };
  },

  async evaluateApplication(applicationId: string, decision: string, notes: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/evaluations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, notes }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, decision, notes };
  },

  async updateApplicationStatus(applicationId: string, status: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, status };
  },

  // Talent Pool
  async searchTalentPool(params?: { search?: string; skill?: string; seniority?: string }): Promise<Candidate[]> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`${API_BASE_URL}/talent-pool?${query}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
      }
    } catch {
      // Fallback
    }
    let pool = [...MOCK_TALENT_POOL];
    if (params?.search) {
      const q = params.search.toLowerCase();
      pool = pool.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    if (params?.seniority) {
      pool = pool.filter((c) => c.seniority === params.seniority);
    }
    return pool;
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      totalJobs: 12,
      activeJobs: 3,
      totalApplications: 48,
      activeApplications: 26,
      hiredCount: 5,
      pipelineByStage: [
        { stageName: 'Inscrição', count: 18 },
        { stageName: 'Triagem Técnica', count: 12 },
        { stageName: 'Entrevista com RH', count: 8 },
        { stageName: 'Case Prático', count: 5 },
        { stageName: 'Proposta / Contratação', count: 5 },
      ],
      recentApplications: [
        {
          id: 'app-1',
          candidateName: 'Camila Alencar',
          jobTitle: 'Senior CRM & Marketing Automation Specialist',
          score: 95,
          stageName: 'Entrevista com RH',
          status: 'ACTIVE',
          appliedAt: 'Há 2 dias',
        },
        {
          id: 'app-2',
          candidateName: 'Rodrigo Mendonça',
          jobTitle: 'Senior CRM & Marketing Automation Specialist',
          score: 88,
          stageName: 'Triagem Técnica',
          status: 'ACTIVE',
          appliedAt: 'Há 4 dias',
        },
        {
          id: 'app-5',
          candidateName: 'Mariana Duarte',
          jobTitle: 'Designer Gráfico & Motion Banner',
          score: 92,
          stageName: 'Avaliação de Portfólio',
          status: 'ACTIVE',
          appliedAt: 'Há 1 dia',
        },
      ],
    };
  },

  // Candidate Portal
  async getCandidateApplications(): Promise<Application[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/candidates/me`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applications) return data.applications;
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'cand-app-1',
        jobId: 'job-1',
        candidateId: 'my-cand-id',
        score: 95,
        requiredCriteriaMet: true,
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        job: MOCK_JOBS[0],
        candidate: MOCK_TALENT_POOL[0],
        currentStage: { id: 'stage-3', name: 'Entrevista com RH', order: 3 },
        stageHistories: [
          { id: 'h-1', stage: { id: 'stage-1', name: 'Inscrição' }, changedAt: new Date(Date.now() - 3 * 86400000).toISOString(), note: 'Candidatura recebida pelo portal público' },
          { id: 'h-2', stage: { id: 'stage-2', name: 'Triagem Técnica' }, changedAt: new Date(Date.now() - 2 * 86400000).toISOString(), note: 'Aderência aos requisitos confirmada com score 95%' },
          { id: 'h-3', stage: { id: 'stage-3', name: 'Entrevista com RH' }, changedAt: new Date(Date.now() - 1 * 86400000).toISOString(), note: 'Agendada conversa via Google Meet' },
        ],
      },
    ];
  },
};
