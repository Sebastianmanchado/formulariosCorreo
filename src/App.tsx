import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { AnexosActivosForm } from './components/forms/AnexosActivosForm';
import { CaratulaForm } from './components/forms/CaratulaForm';
import { DetalleMensualForm } from './components/forms/DetalleMensualForm';
import { PdfPreview } from './components/PdfPreview';
import { SaveIndicator, Tabs } from './components/ui';
import {
  AttachmentsProvider,
  useAttachments,
  type AttachmentsApi,
} from './hooks/useAttachments';
import {
  loadProyectoFromStorage,
  useProyectoPersist,
  type PersistApi,
} from './hooks/useLocalStorage';
import { useProyectoForm } from './hooks/useProyectoForm';
import { crearProyectoVacio, type Proyecto } from './schemas/proyecto';
import { generateProyectoPdf, type AttachmentGroup } from './utils/pdfGenerator';

type PdfState = { generating: false } | { generating: true; values: Proyecto };

type TabKey = 'caratula' | 'detalle' | 'anexos';

export default function App() {
  return (
    <AttachmentsProvider>
      <AppInner />
    </AttachmentsProvider>
  );
}

function AppInner() {
  const [initial] = useState(() => loadProyectoFromStorage());
  const methods = useProyectoForm(initial);
  const persist = useProyectoPersist(methods);
  const attachments = useAttachments();

  const [tab, setTab] = useState<TabKey>('caratula');
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfState>({ generating: false });

  const handleReset = () => {
    const ok = window.confirm(
      '¿Limpiar todo el formulario? Los datos no guardados se perderán y se borrará el borrador local.'
    );
    if (!ok) return;
    methods.reset(crearProyectoVacio());
    persist.clearStorage();
    attachments.clearAll();
    setTab('caratula');
  };

  const handleGeneratePdf = async () => {
    persist.saveNow();
    const values = methods.getValues();
    setPdf({ generating: true, values });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    try {
      const root = pdfRootRef.current;
      if (root) {
        await generateProyectoPdf(root, {
          nombreProyecto: values.caratula?.descripcion?.denominacion,
          attachments: buildAttachmentGroups(values, attachments),
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

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          className="no-print"
        >
          <Tabs.List>
            <Tabs.Trigger value="caratula">① Carátula</Tabs.Trigger>
            <Tabs.Trigger value="detalle">② Detalle Mensual</Tabs.Trigger>
            <Tabs.Trigger value="anexos">③ Anexos Activos</Tabs.Trigger>
          </Tabs.List>

          <main className="mx-auto max-w-[1100px] px-6 py-6">
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              <Tabs.Panel value="caratula">
                <CaratulaForm />
              </Tabs.Panel>
              <Tabs.Panel value="detalle">
                <DetalleMensualForm />
              </Tabs.Panel>
              <Tabs.Panel value="anexos">
                <AnexosActivosForm />
              </Tabs.Panel>
            </form>
          </main>
        </Tabs>

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

function buildAttachmentGroups(
  values: Proyecto,
  attachments: AttachmentsApi
): AttachmentGroup[] {
  const desc = values.caratula?.descripcion;
  return [
    {
      label: 'Descripción',
      items: (desc?.descripcionAnexos ?? []).map((meta) => ({
        meta,
        blob: attachments.getBlob(meta.id),
      })),
    },
    {
      label: 'Objetivos y justificación',
      items: (desc?.objetivosAnexos ?? []).map((meta) => ({
        meta,
        blob: attachments.getBlob(meta.id),
      })),
    },
  ];
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
