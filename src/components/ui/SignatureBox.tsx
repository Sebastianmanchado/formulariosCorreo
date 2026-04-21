type Props = {
  title: string;
};

/**
 * Caja de firma para autorizaciones. Totalmente decorativa: las líneas de
 * firma y fecha se completan a mano tras imprimir / bajar el PDF.
 */
export function SignatureBox({ title }: Props) {
  return (
    <div className="flex flex-col rounded-sm border border-border bg-white p-2.5">
      <div className="mb-2 min-h-[24px] border-b border-border pb-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-accent">
        {title}
      </div>
      <div className="my-1.5 h-8 border-b border-border" />
      <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
        <span>Fecha:</span>
        <span className="flex-1 border-b border-border" />
      </div>
    </div>
  );
}
