import { forwardRef, type InputHTMLAttributes } from 'react';

type Props = {
  title: string;
  dateInputProps?: InputHTMLAttributes<HTMLInputElement>;
  dateInputRef?: React.Ref<HTMLInputElement>;
};

/**
 * Caja de firma para autorizaciones. El espacio de firma se deja vacío
 * (se completa a mano tras imprimir). La fecha es editable.
 */
export const SignatureBox = forwardRef<HTMLDivElement, Props>(function SignatureBox(
  { title, dateInputProps, dateInputRef },
  ref
) {
  return (
    <div
      ref={ref}
      className="flex flex-col rounded-sm border border-border bg-white p-2.5"
    >
      <div className="mb-2 border-b border-border pb-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-accent">
        {title}
      </div>
      <div className="my-1.5 h-8 border-b border-border" />
      <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
        <span>Fecha:</span>
        <input
          ref={dateInputRef}
          type="date"
          className="inline-block border-b border-border bg-transparent px-1 py-0.5 text-[11px] text-ink outline-none focus:border-accent"
          {...dateInputProps}
        />
      </div>
    </div>
  );
});
