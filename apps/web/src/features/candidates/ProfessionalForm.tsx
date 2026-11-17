import { useState, type ReactNode } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SENIORITIES,
  type ProfileField,
  type CurrentUser,
  type ProfessionalProfile,
  type ProfessionalInput,
} from '@pointmedia/shared';
import { api } from '../../lib/api';
import { seniorityLabels } from '../../lib/format';
import { Feedback } from '../../components/Feedback';
import { FieldError } from '../../components/FieldError';
import { PasswordInput } from '../../components/PasswordInput';
import {
  profileDefaults,
  profileInput,
  profileSchema,
  registrationProfileSchema,
  type ProfileFields,
} from './profile-schema';
import './candidates.css';

export const profileKey = ['professional-profile'] as const;
export interface Notice {
  text: string;
  error?: boolean;
}
function NotApplicable({
  label,
  checked,
  onChange,
  children,
  error,
  errorId,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  error?: string;
  errorId?: string;
}) {
  return (
    <fieldset className="professional-section" aria-describedby={error ? errorId : undefined}>
      <legend>{label}</legend>
      <label className="na-choice">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={`${label}: Não se aplica`}
        />
        Não se aplica
      </label>
      <fieldset className="na-content" disabled={checked}>
        {children}
      </fieldset>
      {error && errorId && <FieldError id={errorId} message={error} />}
    </fieldset>
  );
}
export function ProfessionalForm({
  profile,
  user,
  onSaved,
  extraFields,
  validateExtra,
  submitLabel = 'Salvar perfil',
  busy = false,
  showSharing = true,
  onSubmitSaved,
  heading = 'Meu perfil profissional',
  onRegister,
}: {
  profile: ProfessionalProfile | null;
  user?: CurrentUser;
  onSaved?: (profile: ProfessionalProfile, notice: Notice) => void;
  onRegister?: (
    profile: ProfessionalInput,
    email: string,
    password: string,
    file?: File,
  ) => Promise<void>;
  extraFields?: ReactNode;
  validateExtra?: () => string | undefined;
  submitLabel?: string;
  busy?: boolean;
  showSharing?: boolean;
  onSubmitSaved?: () => void;
  heading?: string;
}) {
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const form = useForm<ProfileFields>({
    resolver: zodResolver(onRegister ? registrationProfileSchema : profileSchema),
    defaultValues: profileDefaults(profile, user),
  });
  const { register, control, watch, setValue, getFieldState, formState } = form;
  const field = (name: FieldPath<ProfileFields>) => ({
    ...register(name),
    'aria-invalid': Boolean(getFieldState(name, formState).error),
    'aria-describedby': getFieldState(name, formState).error
      ? `professional-${name}-error`
      : undefined,
  });
  const fieldError = (name: FieldPath<ProfileFields>) => (
    <FieldError
      id={`professional-${name}-error`}
      message={getFieldState(name, formState).error?.message}
    />
  );
  const experience = useFieldArray({ control, name: 'experience' });
  const education = useFieldArray({ control, name: 'education' });
  const selected = watch('notApplicable');
  const absent = (field: ProfileField) => selected.includes(field);
  const toggle = (field: ProfileField, checked: boolean) => {
    setValue(
      'notApplicable',
      checked
        ? [...selected.filter((item) => item !== field), field]
        : selected.filter((item) => item !== field),
      { shouldValidate: formState.isSubmitted },
    );
    if (checked && field === 'EXPERIENCE') experience.replace([]);
    if (checked && field === 'EDUCATION') education.replace([]);
    const simple = {
      LOCATION: 'location',
      SENIORITY: 'seniority',
      SALARY: 'expectedSalary',
      LINKEDIN: 'linkedin',
      PORTFOLIO: 'portfolio',
      SKILLS: 'skills',
    } as const;
    if (checked && field in simple) setValue(simple[field as keyof typeof simple], '');
  };
  const save = async (value: ProfileFields) => {
    const extraError = validateExtra?.();
    if (extraError) {
      setError(extraError);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      if (onRegister) {
        await onRegister(profileInput(value, 0), value.email!, value.password!, file ?? undefined);
        return;
      }
      let saved = await api.saveProfile(profileInput(value, profile?.version ?? 0));
      let notice: Notice = { text: 'Perfil profissional salvo.' };
      if (file) {
        try {
          saved = { ...saved, resume: await api.uploadResume(file) };
        } catch (failure) {
          notice = {
            text: `Perfil salvo. O currículo não foi enviado: ${failure instanceof Error ? failure.message : 'tente novamente.'} Selecione o arquivo novamente.`,
            error: true,
          };
        }
      }
      onSaved?.(saved, notice);
      if (!notice.error) onSubmitSaved?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar seu perfil.');
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="professional-form"
      noValidate
      onSubmit={form.handleSubmit(save, () => {
        setError('Revise os campos indicados no formulário.');
      })}
    >
      <h2>{heading}</h2>
      <div className="field">
        <label htmlFor="professional-name">Nome *</label>
        <input id="professional-name" autoComplete="name" required {...field('name')} />
        {fieldError('name')}
      </div>
      <div className="professional-columns">
        <div className="field">
          <label htmlFor="professional-email">Email</label>
          {onRegister ? (
            <input
              id="professional-email"
              type="email"
              autoComplete="username"
              required
              {...field('email')}
            />
          ) : (
            <input id="professional-email" type="email" value={user?.email ?? ''} readOnly />
          )}
          {fieldError('email')}
        </div>
        <div className="field">
          <label htmlFor="professional-phone">Telefone</label>
          <input id="professional-phone" type="tel" autoComplete="tel" {...field('phone')} />
          {fieldError('phone')}
        </div>
      </div>
      {onRegister && (
        <div className="field">
          <label htmlFor="professional-password">Senha para sua conta *</label>
          <PasswordInput
            id="professional-password"
            autoComplete="new-password"
            required
            {...field('password')}
            aria-describedby={`registration-password-hint${formState.errors.password ? ' professional-password-error' : ''}`}
          />
          <p id="registration-password-hint" className="hint">
            Use de 12 a 128 caracteres. Sua conta será criada somente quando a inscrição for enviada
            com sucesso.
          </p>
          {fieldError('password')}
        </div>
      )}
      <div className="field">
        <label htmlFor="professional-headline">Área ou título profissional *</label>
        <input
          id="professional-headline"
          placeholder="Ex.: Designer gráfico"
          required
          {...field('headline')}
        />
        {fieldError('headline')}
      </div>
      <NotApplicable
        label="Localização"
        checked={absent('LOCATION')}
        onChange={(checked) => toggle('LOCATION', checked)}
      >
        <input aria-label="Localização" placeholder="Cidade e estado" {...field('location')} />
        {fieldError('location')}
      </NotApplicable>
      <NotApplicable
        label="Senioridade"
        checked={absent('SENIORITY')}
        onChange={(checked) => toggle('SENIORITY', checked)}
      >
        <select aria-label="Senioridade" {...field('seniority')}>
          <option value="">Selecione</option>
          {SENIORITIES.map((item) => (
            <option key={item} value={item}>
              {seniorityLabels[item]}
            </option>
          ))}
        </select>
        {fieldError('seniority')}
      </NotApplicable>
      <NotApplicable
        label="Pretensão salarial"
        checked={absent('SALARY')}
        onChange={(checked) => toggle('SALARY', checked)}
      >
        <input
          aria-label="Pretensão salarial"
          inputMode="decimal"
          placeholder="Ex.: R$ 3000,00"
          {...field('expectedSalary')}
        />
        {fieldError('expectedSalary')}
      </NotApplicable>
      <NotApplicable
        label="LinkedIn"
        checked={absent('LINKEDIN')}
        onChange={(checked) => toggle('LINKEDIN', checked)}
      >
        <input
          aria-label="LinkedIn"
          type="url"
          placeholder="Digite o endereço do seu perfil do LinkedIn"
          {...field('linkedin')}
        />
        {fieldError('linkedin')}
      </NotApplicable>
      <NotApplicable
        label="Portfólio"
        checked={absent('PORTFOLIO')}
        onChange={(checked) => toggle('PORTFOLIO', checked)}
      >
        <input aria-label="Portfólio" type="url" placeholder="https://" {...field('portfolio')} />
        {fieldError('portfolio')}
      </NotApplicable>
      <NotApplicable
        label="Ferramentas que domina"
        checked={absent('SKILLS')}
        onChange={(checked) => toggle('SKILLS', checked)}
      >
        <input
          aria-label="Ferramentas que domina"
          placeholder="Ex.: Java, Photoshop, etc."
          {...field('skills')}
        />
        {fieldError('skills')}
        <p className="hint">Separe as competências por vírgula.</p>
      </NotApplicable>
      <NotApplicable
        label="Experiência profissional"
        checked={absent('EXPERIENCE')}
        onChange={(checked) => toggle('EXPERIENCE', checked)}
        error={formState.errors.experience?.root?.message}
        errorId="professional-experience-error"
      >
        {experience.fields.map((item, index) => (
          <div className="professional-entry" key={item.id}>
            <label>
              Empresa
              <input {...field(`experience.${index}.company`)} />
            </label>
            {fieldError(`experience.${index}.company`)}
            <label>
              Cargo
              <input {...field(`experience.${index}.position`)} />
            </label>
            {fieldError(`experience.${index}.position`)}
            <div className="professional-columns">
              <div className="field">
                <label>
                  Início
                  <input type="month" {...field(`experience.${index}.startedMonth`)} />
                </label>
                {fieldError(`experience.${index}.startedMonth`)}
              </div>
              <div className="field">
                <label>
                  Fim (em branco se atual)
                  <input type="month" {...field(`experience.${index}.endedMonth`)} />
                </label>
                {fieldError(`experience.${index}.endedMonth`)}
              </div>
            </div>
            <label>
              Atividades
              <textarea {...field(`experience.${index}.description`)} />
            </label>
            {fieldError(`experience.${index}.description`)}
            <button
              className="button secondary"
              type="button"
              onClick={() => experience.remove(index)}
            >
              Remover experiência {index + 1}
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          disabled={experience.fields.length >= 20}
          onClick={() =>
            experience.append({
              company: '',
              position: '',
              startedMonth: '',
              endedMonth: '',
              description: '',
            })
          }
        >
          Adicionar experiência
        </button>
      </NotApplicable>
      <NotApplicable
        label="Formação acadêmica"
        checked={absent('EDUCATION')}
        onChange={(checked) => toggle('EDUCATION', checked)}
        error={formState.errors.education?.root?.message}
        errorId="professional-education-error"
      >
        {education.fields.map((item, index) => (
          <div className="professional-entry" key={item.id}>
            <label>
              Instituição
              <input {...field(`education.${index}.institution`)} />
            </label>
            {fieldError(`education.${index}.institution`)}
            <label>
              Curso
              <input {...field(`education.${index}.course`)} />
            </label>
            {fieldError(`education.${index}.course`)}
            <div className="professional-columns">
              <div className="field">
                <label>
                  Ano de início
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    {...field(`education.${index}.startedYear`)}
                  />
                </label>
                {fieldError(`education.${index}.startedYear`)}
              </div>
              <div className="field">
                <label>
                  Conclusão (em branco se cursando)
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    {...field(`education.${index}.finishedYear`)}
                  />
                </label>
                {fieldError(`education.${index}.finishedYear`)}
              </div>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() => education.remove(index)}
            >
              Remover formação {index + 1}
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          disabled={education.fields.length >= 20}
          onClick={() =>
            education.append({ institution: '', course: '', startedYear: '', finishedYear: '' })
          }
        >
          Adicionar formação
        </button>
      </NotApplicable>
      <div className="field">
        <label htmlFor="professional-about">Conte sobre você *</label>
        <textarea
          id="professional-about"
          placeholder="Mín. 150 caracteres"
          rows={5}
          required
          {...field('about')}
        />
        {fieldError('about')}
      </div>
      <div className="field">
        <label htmlFor="professional-file">Anexar currículo</label>
        <input
          id="professional-file"
          type="file"
          accept=".pdf,.docx"
          aria-describedby="professional-file-hint"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p id="professional-file-hint" className="hint">
          PDF ou DOCX, até 5 MiB. Um novo envio substitui o currículo anterior.
        </p>
      </div>
      {profile?.resume && (
        <div className="resume-current">
          <a href="/api/candidates/me/resume">Baixar {profile.resume.originalName}</a>
          <button
            className="button secondary"
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await api.removeResume();
                onSaved?.({ ...profile, resume: null }, { text: 'Currículo removido.' });
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : 'Falha ao remover currículo.',
                );
              } finally {
                setPending(false);
              }
            }}
          >
            Remover currículo
          </button>
        </div>
      )}
      {showSharing && (
        <>
          <label className="professional-consent">
            <input type="checkbox" {...register('shareWithRecruiters')} />
            Autorizo compartilhar meus dados e currículo com a equipe da Point Media para
            participação em processos seletivos.
          </label>
          <p className="hint">
            Desmarque e salve para interromper o compartilhamento geral do perfil e currículo.
            Autorizações de candidaturas e do banco de talentos são independentes.
          </p>
        </>
      )}
      {extraFields}
      <Feedback message={error} error />
      <button className="button professional-submit" disabled={pending || busy}>
        {pending || busy ? 'aguarde…' : submitLabel}
      </button>
    </form>
  );
}
