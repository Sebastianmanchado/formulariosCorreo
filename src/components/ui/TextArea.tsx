import { forwardRef, type TextareaHTMLAttributes } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(function TextArea(
  { invalid = false, className = '', rows = 3, ...rest },
  ref
) {
  const base =
    'w-full resize-y rounded-sm border bg-white px-2 py-1.5 text-[13px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-muted/60';
  const color = invalid
    ? 'border-accent2 focus:border-accent2 focus:ring-2 focus:ring-accent2/20'
    : 'border-border-input focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${base} ${color} ${className}`}
      {...rest}
    />
  );
});
