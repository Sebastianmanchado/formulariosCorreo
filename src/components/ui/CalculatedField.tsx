import type { ReactNode } from 'react';
import { formatMoneyZero } from '../../utils/formatters';

type Props = {
  value: number | null | undefined;
  suffix?: ReactNode;
  emphasis?: 'normal' | 'strong';
  className?: string;
  align?: 'left' | 'right';
};

export function CalculatedField({
  value,
  suffix,
  emphasis = 'normal',
  align = 'right',
  className = '',
}: Props) {
  const base =
    'rounded-sm border border-accent/10 bg-accent/5 px-2 py-1.5 font-mono text-[12px] tabular-nums text-accent';
  const weight = emphasis === 'strong' ? 'font-bold text-[13px] bg-accent/10' : 'font-semibold';
  const alignClass = align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={`${base} ${weight} ${alignClass} ${className}`}>
      {formatMoneyZero(value)}
      {suffix ? <span className="ml-1 font-sans font-normal text-ink-muted">{suffix}</span> : null}
    </div>
  );
}
