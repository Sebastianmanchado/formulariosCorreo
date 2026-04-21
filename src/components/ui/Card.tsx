import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: Props) {
  return (
    <div
      className={`mb-3 rounded-sm border border-border bg-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}
