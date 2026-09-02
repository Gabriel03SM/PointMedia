import React from 'react';
import { Brand } from './Brand';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand-wrap">
        <Brand onDark />
        <p className="site-footer__tagline">
          Conectando os melhores talentos de marketing digital, CRM e mídia de performance às maiores marcas.
        </p>
      </div>
      <div className="site-footer__meta">
        <span>© {new Date().getFullYear()} Point Media — Recrutamento & Seleção Inteligente</span>
        <span className="dots dots--footer" aria-hidden="true">
          ● ● ● ● ●
        </span>
      </div>
    </footer>
  );
};
