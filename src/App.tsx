import { useEffect, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { AnexosActivosForm } from './components/forms/AnexosActivosForm';
import { CaratulaForm } from './components/forms/CaratulaForm';
import { DetalleMensualForm } from './components/forms/DetalleMensualForm';
import { PdfPreview } from './components/PdfPreview';
import { SaveIndicator, SectionNav } from './components/ui';
import {
  AttachmentsProvider,
  useAttachments,
  type AttachmentsApi,
} from './hooks/useAttachments';
import { useActiveSection } from './hooks/useActiveSection';
import {
  loadProyectoFromStorage,
  useProyectoPersist,
  type PersistApi,
} from './hooks/useLocalStorage';
import { useProyectoForm } from './hooks/useProyectoForm';
import { crearProyectoVacio, type Proyecto } from './schemas/proyecto';
import { generateProyectoPdf, type AttachmentGroup } from './utils/pdfGenerator';

type PdfState = { generating: false } | { generating: true; values: Proyecto };

/**
 * Secciones del formulario. El `id` se usa como anchor para scroll y como
 * hash de URL (sin el prefijo `section-`).
 */
const SECTIONS = [
  { id: 'section-caratula', hash: 'caratula', label: '① Carátula' },
  { id: 'section-detalle', hash: 'detalle', label: '② Detalle Mensual' },
  { id: 'section-anexos', hash: 'anexos', label: '③ Anexos Activos' },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

function scrollToSection(id: string, updateHash = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (updateHash) {
    const hash = SECTIONS.find((s) => s.id === id)?.hash;
    if (hash) history.replaceState(null, '', `#${hash}`);
  }
}

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

  const active = useActiveSection(SECTION_IDS);
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfState>({ generating: false });

  // Al montar: si la URL trae hash (#detalle, #anexos…), scrollear ahí sin
  // animación para no marear con el load inicial.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = SECTIONS.find((s) => s.hash === hash);
    if (!target) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(target.id);
      el?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, []);

  const handleReset = () => {
    const ok = window.confirm(
      '¿Limpiar todo el formulario? Los datos no guardados se perderán y se borrará el borrador local.'
    );
    if (!ok) return;
    methods.reset(crearProyectoVacio());
    persist.clearStorage();
    attachments.clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#caratula');
  };

  const handleModedaChange = (next: 'pesos' | 'usd') => {
    const ok = window.confirm(
      `¿Cambiar la moneda a ${next.toUpperCase()}?\n\nSe va a borrar TODO lo cargado y el formulario arrancará desde cero en la nueva moneda.`
    );
    if (!ok) return;
    const fresh = crearProyectoVacio();
    // aplicamos el nuevo modo al proyecto limpio antes del reset
    if (fresh.caratula) fresh.caratula.monedaEntrada = next;
    methods.reset(fresh);
    persist.clearStorage();
    attachments.clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#caratula');
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
        {/* Topbar + nav de secciones en el mismo contenedor sticky */}
        <div className="no-print sticky top-0 z-50 shadow-topbar">
          <Topbar
            persist={persist}
            generating={pdf.generating}
            onReset={handleReset}
            onGeneratePdf={handleGeneratePdf}
          />
          <div className="border-b-2 border-border-strong bg-section">
            <SectionNav
              sections={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
              active={active}
              onNavigate={(id) => scrollToSection(id)}
            />
          </div>
        </div>

        <main className="mx-auto max-w-[1100px] px-6 py-6">
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className={`scroll-mt-[110px] ${
                  i > 0 ? 'mt-10 border-t-2 border-border pt-6' : ''
                }`}
              >
                <h1 className="mb-4 text-[18px] font-bold uppercase tracking-wide text-accent">
                  {s.label}
                </h1>
                {s.hash === 'caratula' && (
                  <CaratulaForm onMonedaChange={handleModedaChange} />
                )}
                {s.hash === 'detalle' && <DetalleMensualForm />}
                {s.hash === 'anexos' && <AnexosActivosForm />}
              </section>
            ))}
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
    <header className="flex items-center justify-between gap-4 bg-accent px-6 py-3 text-white">
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
