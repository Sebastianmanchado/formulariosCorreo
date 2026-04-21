import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { label, className = '', ...rest },
  ref
) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-accent"
        {...rest}
      />
      {label !== undefined && <span className="text-[13px] text-ink">{label}</span>}
    </label>
  );
});
