import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function BackLink({
  to,
  children,
  className = '',
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={`back-link ${className}`.trim()} to={to}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
          d="m12 5-7 7 7 7M5 12h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
