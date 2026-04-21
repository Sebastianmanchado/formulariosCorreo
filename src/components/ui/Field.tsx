import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  orientation?: 'row' | 'column';
  labelWidth?: string;
  bold?: boolean;
  hint?: ReactNode;
  className?: string;
};

export function Field({
  label,
  children,
  htmlFor,
  orientation = 'row',
  labelWidth,
  bold = false,
  hint,
  className = '',
}: Props) {
  const labelClass = `text-[13px] text-ink ${bold ? 'font-semibold' : 'font-medium'}`;

  if (orientation === 'column') {
    return (
      <div className={`mb-2 flex flex-col gap-1 ${className}`}>
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
        {children}
        {hint && <div className="text-2xs text-ink-muted">{hint}</div>}
      </div>
    );
  }

  return (
    <div className={`mb-2.5 flex items-start gap-3 ${className}`}>
      <label
        htmlFor={htmlFor}
        className={`${labelClass} whitespace-nowrap pt-1.5`}
        style={labelWidth ? { minWidth: labelWidth, flex: '0 0 auto' } : undefined}
      >
        {label}
      </label>
      <div className="min-w-0 flex-1">
        {children}
        {hint && <div className="mt-1 text-2xs text-ink-muted">{hint}</div>}
      </div>
    </div>
  );
}
