import type { JobStatus, Seniority, WorkMode } from '@pointmedia/shared';

export const seniorityLabels: Record<Seniority, string> = {
  INTERN: 'Estágio',
  JUNIOR: 'Júnior',
  MID: 'Pleno',
  SENIOR: 'Sênior',
  LEAD: 'Liderança',
};
export const workModeLabels: Record<WorkMode, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ONSITE: 'Presencial',
};
export const jobStatusLabels: Record<JobStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicada',
  CLOSED: 'Encerrada',
  CANCELLED: 'Cancelada',
};
export const money = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
export const dateTimeLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
export function decimalInput(value: string) {
  let result = value.trim().replace(/^R\$\s*/, '');
  if (result.includes(',')) result = result.replaceAll('.', '').replace(',', '.');
  return /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(result) ? result : null;
}
export const splitSkills = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
export function saoPauloInput(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (name: string) => parts.find((item) => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function fromSaoPaulo(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Informe data e horário válidos.');
  const wall = Date.parse(`${value}:00Z`);
  let instant = wall;
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = Date.parse(`${saoPauloInput(new Date(instant).toISOString())}:00Z`);
    instant += wall - local;
  }
  const result = new Date(instant).toISOString();
  if (saoPauloInput(result) !== value)
    throw new Error('Esse horário não existe no fuso de Brasília.');
  return result;
}
