import { forwardRef, type InputHTMLAttributes } from 'react';

type Width = 'sm' | 'md' | 'lg' | 'full';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  width?: Width;
  invalid?: boolean;
};

const WIDTH_CLASS: Record<Width, string> = {
  sm: 'w-28',
  md: 'w-48',
  lg: 'w-72',
  full: 'w-full',
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { width = 'full', invalid = false, className = '', ...rest },
  ref
) {
  const base =
    'rounded-sm border bg-white px-2 py-1.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted/60 disabled:bg-section disabled:text-ink-muted disabled:cursor-not-allowed';
  const color = invalid
    ? 'border-accent2 focus:border-accent2 focus:ring-2 focus:ring-accent2/20'
    : 'border-border-input focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <input
      ref={ref}
      className={`${base} ${color} ${WIDTH_CLASS[width]} ${className}`}
      {...rest}
    />
  );
});
