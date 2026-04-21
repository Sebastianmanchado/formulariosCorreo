import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { CaratulaForm } from './components/forms/CaratulaForm';
import { PdfPreview } from './components/PdfPreview';
import { SaveIndicator } from './components/ui';
import {
  loadProyectoFromStorage,
  useProyectoPersist,
  type PersistApi,
} from './hooks/useLocalStorage';
import { useProyectoForm } from './hooks/useProyectoForm';
import { crearProyectoVacio, type Proyecto } from './schemas/proyecto';
import { generateProyectoPdf } from './utils/pdfGenerator';

type PdfState = { generating: false } | { generating: true; values: Proyecto };

export default function App() {
  const [initial] = useState(() => loadProyectoFromStorage());
  const methods = useProyectoForm(initial);
  const persist = useProyectoPersist(methods);

  const pdfRootRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfState>({ generating: false });

  const handleReset = () => {
    const ok = window.confirm(
      '¿Limpiar todo el formulario? Los datos no guardados se perderán y se borrará el borrador local.'
    );
    if (!ok) return;
    methods.reset(crearProyectoVacio());
    persist.clearStorage();
  };

  const handleGeneratePdf = async () => {
    // Flush al storage antes de exportar.
    persist.saveNow();

    const values = methods.getValues();
    setPdf({ generating: true, values });

    // Dejamos que React monte el PdfPreview, las fuentes carguen y el layout
    // se estabilice antes de que html2canvas capture.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    try {
      const root = pdfRootRef.current;
      if (root) {
        await generateProyectoPdf(root, {
          nombreProyecto: values.caratula?.descripcion?.denominacion,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error generando PDF:', err);
      window.alert(
        'Hubo un problema generando el PDF. Revisá la consola para más detalle.'
      );
    } finally {
      setPdf({ generating: false });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-bg font-sans text-ink">
        <Topbar
          persist={persist}
          generating={pdf.generating}
          onReset={handleReset}
          onGeneratePdf={handleGeneratePdf}
        />
        <main className="mx-auto max-w-[1100px] px-6 py-6">
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <CaratulaForm />
          </form>
        </main>

        {/* PdfPreview off-screen: se monta solo durante la generación. */}
        {pdf.generating && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: '-10000px',
              top: 0,
              zIndex: -1,
              pointerEvents: 'none',
            }}
          >
            <PdfPreview ref={pdfRootRef} values={pdf.values} />
          </div>
        )}
      </div>
    </FormProvider>
  );
}

function Topbar({
  persist,
  generating,
  onReset,
  onGeneratePdf,
}: {
  persist: PersistApi;
  generating: boolean;
  onReset: () => void;
  onGeneratePdf: () => void;
}) {
  return (
    <header className="no-print sticky top-0 z-50 flex items-center justify-between gap-4 bg-accent px-6 py-3 text-white shadow-topbar">
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-[11px] tracking-wider opacity-70">
          AD-OO-0136/01-05 · Ene. 22
        </span>
        <span className="truncate text-[15px] font-semibold">
          Aprobación de Proyecto de Erogaciones Mayores
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <SaveIndicator
          status={persist.status}
          lastSavedAt={persist.lastSavedAt}
        />
        <button
          type="button"
          onClick={persist.saveNow}
          className="rounded-sm border border-white/30 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-sm border border-white/30 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onGeneratePdf}
          disabled={generating}
          className="flex items-center gap-2 rounded-sm bg-white px-4 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PrinterIcon />
          {generating ? 'Generando…' : 'Imprimir / PDF'}
        </button>
      </div>
    </header>
  );
}

function PrinterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
