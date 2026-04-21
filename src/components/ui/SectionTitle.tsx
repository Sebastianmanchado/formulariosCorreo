import type { ReactNode } from 'react';

type Variant = 'primary' | 'sub' | 'sub2';

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function SectionTitle({ children, variant = 'primary', className = '' }: Props) {
  if (variant === 'primary') {
    return (
      <h2
        className={`mb-3 mt-5 rounded-sm bg-accent px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white ${className}`}
      >
        {children}
      </h2>
    );
  }
  if (variant === 'sub') {
    return (
      <h3
        className={`mb-2.5 mt-4 border-l-4 border-accent bg-section px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent ${className}`}
      >
        {children}
      </h3>
    );
  }
  return (
    <h4
      className={`mb-2 mt-3 border-l-2 border-border px-2.5 py-1 text-[11px] uppercase tracking-wide text-ink-muted ${className}`}
    >
      {children}
    </h4>
  );
}
