import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Trabalhe conosco',
  '/vagas': 'Vagas disponíveis',
  '/entrar': 'Realizar login',
  '/cadastro': 'Cadastro de candidato',
  '/perfil': 'Meu perfil',
  '/candidato': 'Portal do candidato',
  '/banco-de-talentos': 'Banco de talentos',
  '/gestao/dashboard': 'Dashboard de recrutamento',
  '/gestao/candidatos': 'Candidatos',
  '/gestao/talentos': 'Banco de talentos',
  '/gestao/vagas': 'Gestão de vagas',
  '/gestao/triagem': 'Triagem e decisões',
  '/admin/dashboard': 'Dashboard administrativo',
  '/admin/metricas': 'Métricas gerais',
};

export function RouteAccessibility() {
  const { pathname, hash } = useLocation();
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    const title =
      titles[pathname] ?? (pathname.startsWith('/vagas/') ? 'Informações da vaga' : 'Candidatura');
    document.title = `${title} | Point Media`;
    const current = `${pathname}${hash}`;
    if (previous.current === current && !hash) return;
    const shouldFocus = previous.current !== undefined || Boolean(hash);
    previous.current = current;
    if (!shouldFocus) return;

    const focusContent = () => {
      const target = hash
        ? document.getElementById(hash.slice(1))
        : document.querySelector<HTMLElement>('main h1');
      if (!target) return false;
      target.tabIndex = -1;
      target.focus();
      return true;
    };
    if (focusContent()) return;
    const observer = new MutationObserver(() => {
      if (focusContent()) observer.disconnect();
    });
    observer.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [pathname, hash]);
  return null;
}
