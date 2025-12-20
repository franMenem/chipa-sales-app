import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  const hoverStyles = hoverable || onClick
    ? 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-surface-light dark:bg-surface-dark
        border border-slate-100 dark:border-slate-800
        p-4 transition-all duration-200
        ${hoverStyles}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
