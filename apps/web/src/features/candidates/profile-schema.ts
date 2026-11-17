import { z } from 'zod';
import {
  PROFILE_FIELDS,
  SENIORITIES,
  type ProfessionalInput,
  type ProfessionalProfile,
  type CurrentUser,
} from '@pointmedia/shared';
import { decimalInput, splitSkills } from '../../lib/format';

const text = (max: number) => z.string().trim().max(max);
const month = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, 'Informe mês e ano da experiência.');
const year = z.string().regex(/^(19|20)\d{2}$/, 'Informe um ano entre 1900 e 2099.');
const httpUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
export const profileSchema = z
  .object({
    name: text(120).min(2, 'Informe seu nome completo.'),
    phone: text(30).regex(/^[\d+()\s.-]*$/, 'Confira o telefone.'),
    headline: text(120).min(2, 'Informe sua área ou título profissional.'),
    location: text(160),
    seniority: z.enum([...SENIORITIES, '']),
    expectedSalary: text(30),
    linkedin: text(500),
    portfolio: text(500),
    about: text(5000).min(150, 'Conte sobre você usando ao menos 150 caracteres.'),
    skills: text(3300),
    experience: z
      .array(
        z.object({
          company: text(160).min(2, 'Informe a empresa.'),
          position: text(160).min(2, 'Informe o cargo.'),
          startedMonth: month,
          endedMonth: z.union([z.literal(''), month]),
          description: text(2000),
        }),
      )
      .max(20),
    education: z
      .array(
        z.object({
          institution: text(160).min(2, 'Informe a instituição.'),
          course: text(160).min(2, 'Informe o curso.'),
          startedYear: year,
          finishedYear: z.union([z.literal(''), year]),
        }),
      )
      .max(20),
    notApplicable: z.array(z.enum(PROFILE_FIELDS)),
    shareWithRecruiters: z.boolean(),
    email: z.string().trim().toLowerCase().optional(),
    password: z.string().optional(),
  })
  .superRefine((value, context) => {
    const checks = [
      ['LOCATION', value.location.length > 1, 'Localização', 'location'],
      ['SENIORITY', Boolean(value.seniority), 'Senioridade', 'seniority'],
      [
        'SALARY',
        decimalInput(value.expectedSalary) !== null,
        'Pretensão salarial',
        'expectedSalary',
      ],
      [
        'LINKEDIN',
        httpUrl(value.linkedin) &&
          /^(www\.)?linkedin\.com$/i.test(new URL(value.linkedin).hostname),
        'LinkedIn',
        'linkedin',
      ],
      ['PORTFOLIO', httpUrl(value.portfolio), 'Portfólio', 'portfolio'],
      [
        'SKILLS',
        splitSkills(value.skills).length > 0 &&
          splitSkills(value.skills).length <= 40 &&
          splitSkills(value.skills).every((item) => item.length <= 80),
        'Competências',
        'skills',
      ],
      ['EXPERIENCE', value.experience.length > 0, 'Experiência', 'experience'],
      ['EDUCATION', value.education.length > 0, 'Formação', 'education'],
    ] as const;
    for (const [field, valid, label, path] of checks) {
      if (!value.notApplicable.includes(field) && !valid)
        context.addIssue({
          code: 'custom',
          path: path === 'experience' || path === 'education' ? [path, 'root'] : [path],
          message: `${label}: preencha ou marque Não se aplica.`,
        });
    }
    for (const [index, experience] of value.experience.entries())
      if (experience.endedMonth && experience.endedMonth < experience.startedMonth)
        context.addIssue({
          code: 'custom',
          path: ['experience', index, 'endedMonth'],
          message: 'A data final da experiência não pode anteceder a inicial.',
        });
    for (const [index, education] of value.education.entries())
      if (education.finishedYear && education.finishedYear < education.startedYear)
        context.addIssue({
          code: 'custom',
          path: ['education', index, 'finishedYear'],
          message: 'O ano de conclusão não pode anteceder o início.',
        });
  });
export type ProfileFields = z.infer<typeof profileSchema>;

export const registrationProfileSchema = profileSchema.superRefine((value, context) => {
  if (!z.string().email().max(254).safeParse(value.email).success)
    context.addIssue({ code: 'custom', path: ['email'], message: 'Informe um e-mail válido.' });
  if (!value.password || value.password.length < 12 || value.password.length > 128)
    context.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'Use uma senha com 12 a 128 caracteres.',
    });
});

export function profileDefaults(
  profile: ProfessionalProfile | null,
  user?: CurrentUser,
): ProfileFields {
  return {
    name: profile?.name ?? user?.name ?? '',
    phone: profile?.phone ?? user?.phone ?? '',
    email: user?.email ?? '',
    password: '',
    headline: profile?.headline ?? '',
    location: profile?.location ?? '',
    seniority: profile?.seniority ?? '',
    expectedSalary: profile?.expectedSalary?.replace('.', ',') ?? '',
    linkedin: profile?.linkedin ?? '',
    portfolio: profile?.portfolio ?? '',
    about: profile?.about ?? '',
    skills: profile?.skills.join(', ') ?? '',
    experience:
      profile?.experience.map((item) => ({ ...item, endedMonth: item.endedMonth ?? '' })) ?? [],
    education:
      profile?.education.map((item) => ({
        ...item,
        startedYear: String(item.startedYear),
        finishedYear: item.finishedYear == null ? '' : String(item.finishedYear),
      })) ?? [],
    notApplicable: profile?.notApplicable ?? [],
    shareWithRecruiters: profile?.shareWithRecruiters ?? false,
  };
}
export function profileInput(value: ProfileFields, version: number): ProfessionalInput {
  const absent = (field: (typeof PROFILE_FIELDS)[number]) => value.notApplicable.includes(field);
  return {
    version,
    name: value.name,
    phone: value.phone || null,
    headline: value.headline,
    about: value.about,
    location: absent('LOCATION') ? null : value.location,
    seniority: absent('SENIORITY') ? null : value.seniority || null,
    expectedSalary: absent('SALARY') ? null : decimalInput(value.expectedSalary),
    linkedin: absent('LINKEDIN') ? null : value.linkedin,
    portfolio: absent('PORTFOLIO') ? null : value.portfolio,
    skills: absent('SKILLS') ? [] : splitSkills(value.skills),
    experience: absent('EXPERIENCE')
      ? []
      : value.experience.map((item) => ({ ...item, endedMonth: item.endedMonth || null })),
    education: absent('EDUCATION')
      ? []
      : value.education.map((item) => ({
          ...item,
          startedYear: Number(item.startedYear),
          finishedYear: item.finishedYear ? Number(item.finishedYear) : null,
        })),
    notApplicable: value.notApplicable,
    shareWithRecruiters: value.shareWithRecruiters,
  };
}
