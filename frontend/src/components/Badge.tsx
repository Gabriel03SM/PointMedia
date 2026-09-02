import React from 'react';

export type BadgeVariant =
  | 'pink'
  | 'blue'
  | 'ink'
  | 'success'
  | 'warning'
  | 'gray'
  | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  icon,
  className = '',
}) => {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`}>
      {icon && <span className="badge__icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
