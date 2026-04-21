import { forwardRef, type SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { invalid = false, className = '', children, ...rest },
  ref
) {
  const base =
    'w-full cursor-pointer rounded-sm border bg-white px-2 py-1.5 text-[13px] text-ink outline-none transition-colors disabled:cursor-not-allowed disabled:bg-section disabled:text-ink-muted';
  const color = invalid
    ? 'border-accent2 focus:border-accent2 focus:ring-2 focus:ring-accent2/20'
    : 'border-border-input focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <select ref={ref} className={`${base} ${color} ${className}`} {...rest}>
      {children}
    </select>
  );
});
