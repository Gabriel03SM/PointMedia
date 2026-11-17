import { DEFAULT_SCREENING_SETTINGS as settings, type ScreeningSettings } from '@pointmedia/shared';
import { evaluate, type ScreeningJobInput, type ScreeningProfileInput } from './evaluate';

const job: ScreeningJobInput = {
  requiredSkills: ['React', 'TypeScript'],
  desiredSkills: ['Testes'],
  seniority: 'SENIOR',
  salaryMax: '5000.00',
};
const profile: ScreeningProfileInput = {
  skills: ['React', 'TypeScript', 'Testes'],
  seniority: 'SENIOR',
  expectedSalary: '4500.00',
};
const technology: ScreeningSettings = {
  ...settings,
  skillsWeight: 100,
  seniorityWeight: 0,
  salaryWeight: 0,
};

describe('compatibilidade declarada por vaga', () => {
  it('compatibilidade completa recebe 100 com cobertura total', () => {
    const result = evaluate(job, profile, settings);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
    expect(result.reviewRequired).toBe(false);
    expect(result.criteria.map((item) => item.contribution)).toEqual([50, 30, 20]);
  });
  it('combina aderência parcial e sinaliza indispensável não declarado', () => {
    const result = evaluate(job, { ...profile, skills: ['React'], seniority: 'JUNIOR' }, settings);
    expect(result.score).toBe(52.5);
    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain(
      'Indispensável não declarado: TypeScript. Confirmar com o candidato.',
    );
    expect(result.criteria[0]!.notes).toContain('Confirmar com o candidato: TypeScript');
  });
  it('ausência de salário redistribui os pesos conhecidos e informa cobertura', () => {
    const result = evaluate(job, { ...profile, expectedSalary: null }, settings);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(80);
    expect(result.reviewRequired).toBe(true);
    expect(result.criteria[2]!.score).toBeNull();
    expect(result.criteria[2]!.contribution).toBeNull();
    expect(result.criteria[2]!.status).toBe('NOT_INFORMED');
  });
  it('lista ausente não afirma ausência de domínio', () => {
    const result = evaluate(job, { ...profile, skills: [] }, settings);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(50);
    expect(result.criteria[0]!.score).toBeNull();
    expect(result.criteria[0]!.explanation).toContain('não se presume ausência de domínio');
  });
  it('política de dados completos mantém nota pendente quando faltam informações', () => {
    const result = evaluate(
      job,
      { ...profile, expectedSalary: null },
      { ...settings, requireCompleteData: true },
    );
    expect(result.score).toBeNull();
    expect(result.coverage).toBe(80);
    expect(result.reviewRequired).toBe(true);
  });
  it('não atribui nota sem dados aplicáveis suficientes', () => {
    const result = evaluate(job, { skills: [], seniority: null, expectedSalary: null }, settings);
    expect(result.score).toBeNull();
    expect(result.coverage).toBe(0);
  });
  it('vaga sem critérios não cria uma nota artificial', () => {
    const result = evaluate(
      { requiredSkills: [], desiredSkills: [], seniority: null, salaryMax: null },
      profile,
      settings,
    );
    expect(result.score).toBeNull();
    expect(result.criteria.every((item) => item.status === 'NOT_APPLICABLE')).toBe(true);
  });
  it('usa pesos recebidos em vez de pesos fixos no cálculo', () => {
    const candidate = { ...profile, expectedSalary: '10000.00' };
    expect(
      evaluate(job, candidate, {
        ...settings,
        skillsWeight: 0,
        seniorityWeight: 0,
        salaryWeight: 100,
      }).score,
    ).toBe(50);
    expect(
      evaluate(job, candidate, {
        ...settings,
        skillsWeight: 100,
        seniorityWeight: 0,
        salaryWeight: 0,
      }).score,
    ).toBe(100);
  });
  it('participação dos indispensáveis é configurável e não elimina ninguém', () => {
    const candidate = { ...profile, skills: ['React', 'TypeScript'] };
    expect(evaluate(job, candidate, { ...technology, mandatorySkillsShare: 100 }).score).toBe(100);
    expect(evaluate(job, candidate, { ...technology, mandatorySkillsShare: 0 }).score).toBe(0);
    const missing = evaluate(job, { ...profile, skills: ['Testes'] }, technology);
    expect(missing.score).toBe(30);
    expect(missing.reviewRequired).toBe(true);
  });
  it('redistribui a participação quando só há requisitos indispensáveis ou diferenciais', () => {
    expect(evaluate({ ...job, desiredSkills: [] }, profile, technology).score).toBe(100);
    expect(evaluate({ ...job, requiredSkills: [] }, profile, technology).score).toBe(100);
  });
  it('normaliza caixa, espaços e formas Unicode sem inferir sinônimos', () => {
    expect(
      evaluate(
        { ...job, requiredSkills: ['Ｒｅａｃｔ'], desiredSkills: [] },
        { ...profile, skills: [' react '] },
        technology,
      ).score,
    ).toBe(100);
    expect(
      evaluate(
        { ...job, requiredSkills: ['JavaScript'], desiredSkills: [] },
        { ...profile, skills: ['JS'] },
        technology,
      ).score,
    ).toBe(0);
  });
  it.each([
    ['INTERN', 25],
    ['JUNIOR', 50],
    ['MID', 75],
    ['SENIOR', 100],
    ['LEAD', 100],
  ] as const)('senioridade %s comparada a Sênior resulta em %s', (seniority, score) => {
    expect(
      evaluate(
        { ...job, requiredSkills: [], desiredSkills: [], salaryMax: null },
        { ...profile, seniority },
        settings,
      ).score,
    ).toBe(score);
  });
  it('zero é uma pretensão informada e não é confundido com ausência', () => {
    expect(
      evaluate(
        { ...job, salaryMax: '0.00' },
        { ...profile, expectedSalary: '0.00' },
        { ...settings, skillsWeight: 0, seniorityWeight: 0, salaryWeight: 100 },
      ).score,
    ).toBe(100);
    expect(
      evaluate(
        { ...job, salaryMax: '0.00' },
        { ...profile, expectedSalary: '100.00' },
        { ...settings, skillsWeight: 0, seniorityWeight: 0, salaryWeight: 100 },
      ).score,
    ).toBe(0);
  });
  it('não aplica critérios que a vaga explicitamente não exige', () => {
    const result = evaluate({ ...job, seniority: null, salaryMax: null }, profile, settings);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
    expect(result.criteria[1]!.status).toBe('NOT_APPLICABLE');
  });
  it('produz a mesma explicação e preserva a soma das contribuições arredondadas', () => {
    const input = { ...profile, skills: ['React'], expectedSalary: '7311.99' };
    const first = evaluate(job, input, settings);
    expect(evaluate(job, input, settings)).toEqual(first);
    expect(
      Number(first.criteria.reduce((sum, item) => sum + (item.contribution ?? 0), 0).toFixed(2)),
    ).toBe(first.score);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
  });
});
