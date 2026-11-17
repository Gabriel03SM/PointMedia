import { PROFILE_FIELDS, TALENT_CONSENT_VERSION } from '@pointmedia/shared';

export function registrationBody(email: string, password: string, name = 'Pessoa Fictícia') {
  return {
    data: {
      name,
      email,
      password,
      profile: {
        version: 0,
        name,
        headline: 'Desenvolvimento web',
        about:
          'Perfil fictício criado exclusivamente para verificar a inscrição e a criação de conta no envio final. Experiência declarada em desenvolvimento web e colaboração com equipes de produto.',
        skills: [],
        experience: [],
        education: [],
        notApplicable: [...PROFILE_FIELDS],
        shareWithRecruiters: false,
      },
      talentConsentVersion: TALENT_CONSENT_VERSION,
    },
  };
}
