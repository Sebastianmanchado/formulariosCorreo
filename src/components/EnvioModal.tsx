import { useEffect, useState } from 'react';
import { CORREO_AMARILLO } from '../data/constants';

export interface PdfListo {
  fileName: string;
  sizeBytes: number;
  /** Resultado de la verificación del PDF generado. */
  valido: boolean;
  asunto: string;
}

interface Props {
  pdf: PdfListo;
  destinatarios: readonly string[];
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function EnvioModal({ pdf, destinatarios, onClose }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const correo = destinatarios.join('; ');
  const mailto = `mailto:${destinatarios.join(',')}?subject=${encodeURIComponent(pdf.asunto)}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);

  const handleCopiar = async (clave: string, texto: string) => {
    if (await copiar(texto)) setCopiado(clave);
  };

  return (
    <div
      className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="envio-modal-title"
        className="w-full max-w-[520px] overflow-hidden rounded-sm border border-border-strong bg-surface shadow-topbar"
      >
        <div className="flex items-center gap-3 bg-accent px-5 py-3 text-white">
          <span
            className="h-6 w-1.5 shrink-0 rounded-sm"
            style={{ background: CORREO_AMARILLO }}
          />
          <h2 id="envio-modal-title" className="text-[15px] font-semibold">
            PDF descargado: ahora envialo por correo
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4 text-[13px] text-ink">
          <div
            className={`flex items-start gap-3 rounded-sm border px-3 py-2 ${
              pdf.valido
                ? 'border-accent/30 bg-section'
                : 'border-accent2/50 bg-accent2/10'
            }`}
          >
            <span
              className={`mt-0.5 text-[16px] font-bold ${
                pdf.valido ? 'text-accent' : 'text-accent2'
              }`}
            >
              {pdf.valido ? '✔' : '✖'}
            </span>
            <div className="min-w-0">
              <div className="font-semibold">
                {pdf.valido
                  ? 'PDF generado y verificado'
                  : 'El PDF generado no pasó la verificación'}
              </div>
              <div className="break-all font-mono text-[11px] text-ink-muted">
                {pdf.fileName} · {formatSize(pdf.sizeBytes)}
              </div>
              {!pdf.valido && (
                <div className="mt-1 text-[12px]">
                  Volvé a presionar Descargar. Si se repite, avisá al equipo.
                </div>
              )}
            </div>
          </div>

          <ol className="space-y-3">
            {[
              <>Abrí tu mail.</>,
              <>Revisá y adjuntá el PDF descargado.</>,
              <>
                Pegá el mail de destino.
                <div className="mt-1.5 flex items-stretch gap-2">
                  <div className="flex min-w-0 flex-1 items-center break-all rounded-sm border border-border-input bg-white px-3 py-2 font-mono text-[12px]">
                    {correo}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopiar('correo', correo)}
                    className="shrink-0 rounded-sm px-3 text-[12px] font-semibold text-ink transition-colors hover:brightness-95"
                    style={{ background: CORREO_AMARILLO }}
                  >
                    {copiado === 'correo' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </>,
              <>
                Enviá el mail para formalizar la solicitud de inicio de firmas.
              </>,
            ].map((paso, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{paso}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-section px-5 py-3">
          <button
            type="button"
            onClick={() => handleCopiar('asunto', pdf.asunto)}
            className="rounded-sm border border-border-strong bg-transparent px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-white/60"
          >
            {copiado === 'asunto' ? '¡Asunto copiado!' : 'Copiar asunto'}
          </button>
          <a
            href={mailto}
            className="rounded-sm border border-accent bg-transparent px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Abrir en mi mail
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-accent px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
