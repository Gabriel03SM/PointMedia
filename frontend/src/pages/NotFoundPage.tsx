import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="not-found page-container">
      <p className="eyebrow">404</p>
      <h1>essa página saiu de cena.</h1>
      <p style={{ margin: '16px 0 24px', color: 'var(--muted)' }}>
        A página que você está procurando não existe ou foi alterada.
      </p>
      <Link to="/" className="button button--primary">
        Voltar ao início
      </Link>
    </main>
  );
}
