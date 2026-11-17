import {
  SENIORITIES,
  type Seniority,
  type ScreeningCriterion,
  type ScreeningEvaluation,
  type ScreeningSettings,
} from '@pointmedia/shared';
import { normalizeName } from '../common/domain';

export interface ScreeningJobInput {
  requiredSkills: string[];
  desiredSkills: string[];
  seniority: Seniority | null;
  salaryMax: string | null;
}
export interface ScreeningProfileInput {
  skills: string[];
  seniority: Seniority | null;
  expectedSalary: string | null;
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function evaluate(
  job: ScreeningJobInput,
  profile: ScreeningProfileInput,
  settings: ScreeningSettings,
): ScreeningEvaluation {
  const criteria: ScreeningCriterion[] = [];
  const reviewReasons: string[] = [];
  const key = (name: string) => normalizeName(name.trim());
  const declared = new Set(profile.skills.map(key));
  const required = job.requiredSkills.filter((name) => declared.has(key(name)));
  const desired = job.desiredSkills.filter((name) => declared.has(key(name)));
  const unconfirmed = job.requiredSkills.filter((name) => !declared.has(key(name)));
  for (const name of unconfirmed)
    reviewReasons.push(`Indispensável não declarado: ${name}. Confirmar com o candidato.`);
  let technology: ScreeningCriterion = {
    key: 'SKILLS',
    status: 'NOT_APPLICABLE',
    weight: settings.skillsWeight,
    score: null,
    contribution: null,
    explanation: 'A vaga não define competências para comparação.',
    notes: [],
  };
  if (job.requiredSkills.length || job.desiredSkills.length) {
    technology = {
      ...technology,
      status: 'NOT_INFORMED',
      explanation: 'Competências não informadas; não se presume ausência de domínio.',
    };
    if (profile.skills.length) {
      const requiredRate = job.requiredSkills.length
        ? required.length / job.requiredSkills.length
        : 0;
      const desiredRate = job.desiredSkills.length ? desired.length / job.desiredSkills.length : 0;
      const requiredShare = !job.requiredSkills.length
        ? 0
        : !job.desiredSkills.length
          ? 1
          : settings.mandatorySkillsShare / 100;
      technology = {
        ...technology,
        status: 'EVALUATED',
        score: round((requiredRate * requiredShare + desiredRate * (1 - requiredShare)) * 100),
        explanation: `${required.length}/${job.requiredSkills.length} indispensáveis e ${desired.length}/${job.desiredSkills.length} diferenciais declarados.`,
        notes: [
          ...required.map((name) => `Indispensável declarado: ${name}`),
          ...desired.map((name) => `Diferencial declarado: ${name}`),
          ...unconfirmed.map((name) => `Confirmar com o candidato: ${name}`),
        ],
      };
    }
  }
  criteria.push(technology);
  let seniority: ScreeningCriterion = {
    key: 'SENIORITY',
    status: 'NOT_APPLICABLE',
    weight: settings.seniorityWeight,
    score: null,
    contribution: null,
    explanation: 'Senioridade não se aplica à vaga.',
    notes: [],
  };
  if (job.seniority) {
    seniority = {
      ...seniority,
      status: 'NOT_INFORMED',
      explanation: 'Senioridade não informada; confirmar com o candidato.',
    };
    if (profile.seniority) {
      const wanted = SENIORITIES.indexOf(job.seniority) + 1;
      const actual = SENIORITIES.indexOf(profile.seniority) + 1;
      seniority = {
        ...seniority,
        status: 'EVALUATED',
        score: round(Math.min(actual / wanted, 1) * 100),
        explanation:
          actual >= wanted
            ? 'Nível declarado igual ou superior ao desejado.'
            : 'Nível declarado abaixo do desejado; aderência parcial para revisão humana.',
      };
    }
  }
  criteria.push(seniority);
  let salary: ScreeningCriterion = {
    key: 'SALARY',
    status: 'NOT_APPLICABLE',
    weight: settings.salaryWeight,
    score: null,
    contribution: null,
    explanation: 'Faixa salarial não se aplica à vaga.',
    notes: [],
  };
  if (job.salaryMax != null) {
    salary = {
      ...salary,
      status: 'NOT_INFORMED',
      explanation: 'Pretensão salarial não informada; não se presume incompatibilidade.',
    };
    if (profile.expectedSalary != null) {
      const expected = Number(profile.expectedSalary);
      const ceiling = Number(job.salaryMax);
      salary = {
        ...salary,
        status: 'EVALUATED',
        score: expected <= ceiling ? 100 : round((ceiling / expected) * 100),
        explanation:
          expected <= ceiling
            ? 'Pretensão declarada dentro do teto de orçamento.'
            : 'Pretensão declarada acima do teto; aderência proporcional, sem eliminação automática.',
      };
    }
  }
  criteria.push(salary);
  const applicable = criteria.filter((item) => item.status !== 'NOT_APPLICABLE' && item.weight > 0);
  const known = applicable.filter((item) => item.status === 'EVALUATED');
  const missing = applicable.filter((item) => item.status === 'NOT_INFORMED');
  for (const item of missing) reviewReasons.push(item.explanation);
  const applicableWeight = applicable.reduce((sum, item) => sum + item.weight, 0);
  const knownWeight = known.reduce((sum, item) => sum + item.weight, 0);
  const coverage = applicableWeight ? round((knownWeight / applicableWeight) * 100) : 0;
  let score: number | null = null;
  if (knownWeight && !(settings.requireCompleteData && missing.length)) {
    score = round(known.reduce((sum, item) => sum + (item.score! * item.weight) / knownWeight, 0));
    let assigned = 0;
    known.forEach((item, index) => {
      item.contribution =
        index === known.length - 1
          ? round(score! - assigned)
          : round((item.score! * item.weight) / knownWeight);
      assigned += item.contribution;
    });
  }
  if (!knownWeight)
    reviewReasons.push('Sem dados aplicáveis suficientes para calcular a compatibilidade.');
  if (settings.requireCompleteData && missing.length)
    reviewReasons.push('Configuração exige os dados completos antes de atribuir nota.');
  return { score, coverage, reviewRequired: reviewReasons.length > 0, reviewReasons, criteria };
}
