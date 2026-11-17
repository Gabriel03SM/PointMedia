import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SENIORITIES, WORK_MODES, type Job, type JobInput } from '@pointmedia/shared';
import { api } from '../../lib/api';
import {
  decimalInput,
  fromSaoPaulo,
  saoPauloInput,
  seniorityLabels,
  splitSkills,
  workModeLabels,
} from '../../lib/format';
import { Feedback } from '../../components/Feedback';
import { FieldError } from '../../components/FieldError';
import { useModalDialog } from '../../components/useModalDialog';

const schema = z
  .object({
    title: z.string().trim().min(3, 'Informe o título da vaga.').max(160),
    description: z
      .string()
      .trim()
      .min(20, 'Descreva a vaga com ao menos 20 caracteres.')
      .max(12000),
    department: z.string().trim().max(120),
    workMode: z.enum(WORK_MODES),
    seniority: z.enum([...SENIORITIES, '']),
    seniorityNotApplicable: z.boolean(),
    location: z.string().trim().max(160),
    locationNotApplicable: z.boolean(),
    salaryMin: z.string(),
    salaryMax: z.string(),
    salaryNotApplicable: z.boolean(),
    closesAt: z.string().min(1, 'Informe o prazo de encerramento.'),
    requiredSkills: z.string(),
    desiredSkills: z.string(),
  })
  .superRefine((value, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: 'custom', path: [path], message });
    if (!value.seniorityNotApplicable && !value.seniority)
      issue('seniority', 'Selecione a senioridade ou marque Não se aplica.');
    if (!value.locationNotApplicable && value.location.length < 2)
      issue('location', 'Informe a localização ou marque Não se aplica.');
    const min = decimalInput(value.salaryMin);
    const max = decimalInput(value.salaryMax);
    if (!value.salaryNotApplicable && (!min || !max || Number(min) > Number(max)))
      issue('salaryMin', 'Preencha a faixa salarial corretamente ou marque Não se aplica.');
    try {
      fromSaoPaulo(value.closesAt);
    } catch {
      issue('closesAt', 'Informe data e horário de encerramento válidos.');
    }
    for (const field of ['requiredSkills', 'desiredSkills'] as const) {
      const skills = splitSkills(value[field]);
      if (skills.length > 40 || skills.some((item) => item.length > 80))
        issue(field, 'Use até 40 requisitos, com no máximo 80 caracteres cada.');
    }
  });
type Fields = z.infer<typeof schema>;
export function JobModal({
  job,
  onClose,
  onSaved,
}: {
  job?: Job;
  onClose: () => void;
  onSaved: (job: Job) => void;
}) {
  const dialog = useModalDialog('#job-title');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const { register, watch, handleSubmit, getFieldState, formState } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: job?.title ?? '',
      description: job?.description ?? '',
      department: job?.department ?? '',
      workMode: job?.workMode ?? 'REMOTE',
      seniority: job?.seniority ?? '',
      seniorityNotApplicable: job?.seniorityNotApplicable ?? false,
      location: job?.location ?? '',
      locationNotApplicable: job?.locationNotApplicable ?? false,
      salaryMin: job?.salaryMin?.replace('.', ',') ?? '',
      salaryMax: job?.salaryMax?.replace('.', ',') ?? '',
      salaryNotApplicable: job?.salaryNotApplicable ?? false,
      closesAt: job ? saoPauloInput(job.closesAt) : '',
      requiredSkills: job?.requiredSkills.join(', ') ?? '',
      desiredSkills: job?.desiredSkills.join(', ') ?? '',
    },
  });
  const field = (name: keyof Fields) => ({
    ...register(name),
    'aria-invalid': Boolean(getFieldState(name, formState).error),
    'aria-describedby': getFieldState(name, formState).error ? `job-${name}-error` : undefined,
  });
  const fieldError = (name: keyof Fields) => (
    <FieldError id={`job-${name}-error`} message={getFieldState(name, formState).error?.message} />
  );
  const submit = async (value: Fields) => {
    setPending(true);
    setError(undefined);
    try {
      const input: JobInput = {
        title: value.title,
        description: value.description,
        department: value.department || undefined,
        workMode: value.workMode,
        seniority: value.seniorityNotApplicable ? null : value.seniority || null,
        seniorityNotApplicable: value.seniorityNotApplicable,
        location: value.locationNotApplicable ? null : value.location,
        locationNotApplicable: value.locationNotApplicable,
        salaryMin: value.salaryNotApplicable ? null : decimalInput(value.salaryMin),
        salaryMax: value.salaryNotApplicable ? null : decimalInput(value.salaryMax),
        salaryNotApplicable: value.salaryNotApplicable,
        closesAt: fromSaoPaulo(value.closesAt),
        requiredSkills: splitSkills(value.requiredSkills),
        desiredSkills: splitSkills(value.desiredSkills),
      };
      onSaved(
        job
          ? await api.updateJob(job.id, { ...input, version: job.version })
          : await api.createJob(input),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar a vaga.');
    } finally {
      setPending(false);
    }
  };
  return (
    <dialog
      className="job-modal"
      ref={dialog}
      aria-labelledby="job-modal-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
    >
      <header className="modal-heading">
        <h2 id="job-modal-title">{job ? 'Editar vaga' : 'Criar vaga'}</h2>
        <button
          className="modal-close"
          type="button"
          aria-label="Fechar formulário"
          disabled={pending}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <form
        className="job-form"
        noValidate
        onSubmit={handleSubmit(submit, () => {
          setError('Revise os campos indicados no formulário.');
        })}
      >
        <div className="field">
          <label htmlFor="job-title">Título *</label>
          <input id="job-title" required {...field('title')} />
          {fieldError('title')}
        </div>
        <div className="field">
          <label htmlFor="job-description">Descrição *</label>
          <textarea id="job-description" rows={5} required {...field('description')} />
          {fieldError('description')}
        </div>
        <div className="field">
          <label htmlFor="job-department">Departamento</label>
          <input id="job-department" {...field('department')} />
          {fieldError('department')}
        </div>
        <div className="job-form-columns">
          <div className="field">
            <label htmlFor="job-seniority">Senioridade</label>
            <select
              id="job-seniority"
              disabled={watch('seniorityNotApplicable')}
              {...field('seniority')}
            >
              <option value="">Selecione</option>
              {SENIORITIES.map((item) => (
                <option key={item} value={item}>
                  {seniorityLabels[item]}
                </option>
              ))}
            </select>
            {fieldError('seniority')}
            <label className="na-choice">
              <input
                type="checkbox"
                aria-label="Senioridade: Não se aplica"
                {...register('seniorityNotApplicable')}
              />
              Não se aplica
            </label>
          </div>
          <div className="field">
            <label htmlFor="job-mode">Modalidade *</label>
            <select id="job-mode" required {...field('workMode')}>
              {WORK_MODES.map((item) => (
                <option key={item} value={item}>
                  {workModeLabels[item]}
                </option>
              ))}
            </select>
            {fieldError('workMode')}
          </div>
        </div>
        <div className="field">
          <label htmlFor="job-location">Localização</label>
          <input
            id="job-location"
            disabled={watch('locationNotApplicable')}
            {...field('location')}
          />
          {fieldError('location')}
          <label className="na-choice">
            <input
              type="checkbox"
              aria-label="Localização: Não se aplica"
              {...register('locationNotApplicable')}
            />
            Não se aplica
          </label>
        </div>
        <fieldset className="job-salary">
          <legend>Faixa salarial</legend>
          <div className="job-form-columns">
            <div className="field">
              <label htmlFor="job-min">Salário mínimo (R$)</label>
              <input
                id="job-min"
                inputMode="decimal"
                disabled={watch('salaryNotApplicable')}
                {...field('salaryMin')}
              />
              {fieldError('salaryMin')}
            </div>
            <div className="field">
              <label htmlFor="job-max">Salário máximo (R$)</label>
              <input
                id="job-max"
                inputMode="decimal"
                disabled={watch('salaryNotApplicable')}
                {...field('salaryMax')}
              />
              {fieldError('salaryMax')}
            </div>
          </div>
          <label className="na-choice">
            <input
              type="checkbox"
              aria-label="Faixa salarial: Não se aplica"
              {...register('salaryNotApplicable')}
            />
            Não se aplica
          </label>
        </fieldset>
        <div className="field">
          <label htmlFor="job-required">Skills obrigatórias</label>
          <input id="job-required" placeholder="Separe por vírgulas" {...field('requiredSkills')} />
          {fieldError('requiredSkills')}
        </div>
        <div className="field">
          <label htmlFor="job-desired">Skills desejáveis</label>
          <input id="job-desired" placeholder="Separe por vírgulas" {...field('desiredSkills')} />
          {fieldError('desiredSkills')}
        </div>
        <div className="field">
          <label htmlFor="job-close">Encerramento (horário de Brasília) *</label>
          <input id="job-close" type="datetime-local" required {...field('closesAt')} />
          {fieldError('closesAt')}
        </div>
        <Feedback message={error} error />
        <div className="modal-actions">
          <button className="button secondary" type="button" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button className="button" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar vaga'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
