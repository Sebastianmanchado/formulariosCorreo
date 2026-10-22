import { useEffect, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { AnexosActivosForm } from './components/forms/AnexosActivosForm';
import { CaratulaForm } from './components/forms/CaratulaForm';
import { DetalleMensualForm } from './components/forms/DetalleMensualForm';
import { PdfPreview } from './components/PdfPreview';
import { ApemMenu, SaveIndicator, SectionNav } from './components/ui';
import {
  AttachmentsProvider,
  useAttachments,
  type AttachmentsApi,
} from './hooks/useAttachments';
import { useActiveSection } from './hooks/useActiveSection';
import {
  loadApemStore,
  useApemCatalog,
  type ApemCatalogApi,
  type ApemStore,
} from './hooks/useLocalStorage';
import { useProyectoForm } from './hooks/useProyectoForm';
import { crearProyectoVacio, validarParaImpresion, type Proyecto } from './schemas/proyecto';
import { CORREO_AMARILLO, APP_VERSION, DESTINATARIOS_FORMULARIO } from './data/constants';
import { descargarCorreoConPdf } from './utils/enviarFormulario';
import { generateProyectoPdf, type AttachmentGroup } from './utils/pdfGenerator';
import { logger } from './utils/logger';

type PdfAction = 'download' | 'email';

type PdfState =
  | { generating: false }
  | { generating: true; values: Proyecto; action: PdfAction };

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
  const [boot] = useState(loadApemStore);
  return (
    <AttachmentsProvider initialActiveId={boot.activeId}>
      <AppInner boot={boot} />
    </AttachmentsProvider>
  );
}

function AppInner({ boot }: { boot: ApemStore }) {
  const exigirPdfRef = useRef(false);
  const methods = useProyectoForm(boot.proyectos[boot.activeId]?.data, exigirPdfRef);
  const attachments = useAttachments();
  const catalog = useApemCatalog(methods, boot, attachments);

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
      '¿Limpiar este APEM? Se vacían los datos cargados. El APEM sigue en la lista.'
    );
    if (!ok) return;
    exigirPdfRef.current = false;
    methods.reset(crearProyectoVacio());
    // Defensive: forzar undefined en campos numéricos que algunos inputs
    // (Controller + MoneyInput) no actualizan de forma confiable tras reset.
    methods.setValue('caratula.cotizacionUsd', undefined, { shouldDirty: false });
    methods.setValue('caratula.evaluacion.horizonteMeses', undefined, { shouldDirty: false });
    methods.setValue('caratula.evaluacion.tir', undefined, { shouldDirty: false });
    methods.setValue('caratula.evaluacion.tasaCorte', undefined, { shouldDirty: false });
    methods.setValue('caratula.evaluacion.van', undefined, { shouldDirty: false });
    methods.setValue('caratula.evaluacion.periodoRepagoMeses', undefined, { shouldDirty: false });
    catalog.saveNow();
    attachments.clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#caratula');
  };

  const showActiveApem = () => {
    exigirPdfRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#caratula');
  };

  const handleModedaChange = (next: 'pesos' | 'usd') => {
    const ok = window.confirm(
      '¿Desea continuar? Se perderán los campos numéricos ya cargados.'
    );
    if (!ok) return;

    // Tomamos una foto del estado actual para rescatar los campos que
    // sobreviven al cambio de moneda. El resto arranca desde cero.
    const current = methods.getValues();
    const fresh = crearProyectoVacio();

    if (fresh.caratula) {
      fresh.caratula.monedaEntrada = next;

      // Cotización USD — la persistimos siempre, aún en modo pesos.
      if (current.caratula?.cotizacionUsd !== undefined) {
        fresh.caratula.cotizacionUsd = current.caratula.cotizacionUsd;
      }

      // Descripción general: denominación + textos libres + flags + anexos
      // adjuntos. NO copiamos tipoErogacion/modalidadEvaluacion porque
      // pueden depender del armado económico que se está rehaciendo.
      const curDesc = current.caratula?.descripcion;
      if (curDesc && fresh.caratula.descripcion) {
        fresh.caratula.descripcion.denominacion = curDesc.denominacion ?? '';
        fresh.caratula.descripcion.descripcion = curDesc.descripcion ?? '';
        fresh.caratula.descripcion.descripcionIncluyeAnexo =
          curDesc.descripcionIncluyeAnexo ?? false;
        fresh.caratula.descripcion.descripcionAnexos =
          curDesc.descripcionAnexos ?? [];
        fresh.caratula.descripcion.objetivos = curDesc.objetivos ?? '';
        fresh.caratula.descripcion.objetivosIncluyeAnexo =
          curDesc.objetivosIncluyeAnexo ?? false;
        fresh.caratula.descripcion.objetivosAnexos =
          curDesc.objetivosAnexos ?? [];
      }
    }

    methods.reset(fresh);
    // Flush inmediato del borrador ya depurado.
    catalog.saveNow();
    logger.info('currency.changed', { to: next });
    // NO limpiamos `attachments`: los blobs referenciados por
    // `descripcionAnexos`/`objetivosAnexos` siguen siendo válidos tras el
    // cambio de moneda y los necesitamos para imprimir adjuntos en el PDF.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#caratula');
  };

  const handleGeneratePdf = (action: PdfAction) => {
    void runPdf(action);
  };

  const runPdf = async (action: PdfAction) => {
    catalog.saveNow();
    const camposPdf = [
      'caratula.encabezado.fecha',
      'caratula.descripcion.denominacion',
      'caratula.descripcion.descripcion',
      'caratula.descripcion.objetivos',
      'caratula.caracteristicas.mesInicio',
      'caratula.caracteristicas.mesFinErogacion',
      'caratula.caracteristicas.mesFinProyecto',
    ] as const;
    const issues = validarParaImpresion(methods.getValues());
    exigirPdfRef.current = issues.length > 0;
    if (issues.length > 0) {
      await methods.trigger([...camposPdf]);
      const hasOrder = issues.some((issue) => issue.kind === 'order');
      const hasRequired = issues.some((issue) => issue.kind === 'required');
      logger.warn('pdf.validation_failed', {
        fields: issues.map((issue) => issue.path),
      });
      const verbo = action === 'email' ? 'enviar' : 'imprimir';
      window.alert(
        hasRequired && hasOrder
          ? 'Completá los campos obligatorios de la carátula. Además, los años y meses de finalización deben ser posteriores al de inicio.'
          : hasOrder
            ? 'Revisá las fechas en Características Básicas: los años y meses de finalización deben ser posteriores al de inicio.'
            : `Completá los campos obligatorios de la carátula antes de ${verbo}.`
      );
      scrollToSection('section-caratula', false);
      return;
    }
    exigirPdfRef.current = false;
    const values = methods.getValues();
    const attachmentGroups = buildAttachmentGroups(values, attachments);
    const attachmentCount = attachmentGroups.reduce(
      (n, g) => n + g.items.length,
      0
    );
    logger.info('pdf.generation_started', { attachmentCount, action });
    setPdf({ generating: true, values, action });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    try {
      const root = pdfRootRef.current;
      if (!root) {
        throw new Error('PdfPreview no disponible para exportar.');
      }
      const generated = await generateProyectoPdf(root, {
        nombreProyecto: values.caratula?.descripcion?.denominacion,
        attachments: attachmentGroups,
        download: action === 'download',
      });
      if (action === 'email') {
        await descargarCorreoConPdf({
          pdf: generated.blob,
          fileName: generated.fileName,
          denominacion: values.caratula?.descripcion?.denominacion,
        });
        logger.info('pdf.email_prepared', { fileName: generated.fileName });
        window.alert(
          `Se preparó el correo con el PDF adjunto para:\n\n${DESTINATARIOS_FORMULARIO.join('\n')}\n\nAbrí el archivo .eml descargado. Outlook lo abre como un mensaje listo para enviar.`
        );
      }
    } catch (err) {
      if (action === 'email') {
        logger.error('pdf.email_failed', {}, err);
        window.alert(
          'No se pudo preparar el correo con el PDF. Revisá la consola para más detalle.'
        );
      } else {
        logger.error('pdf.generation_failed', {}, err);
        window.alert(
          'Hubo un problema generando el PDF. Revisá la consola para más detalle.'
        );
      }
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
            catalog={catalog}
            generating={pdf.generating}
            pdfAction={pdf.generating ? pdf.action : null}
            onReset={handleReset}
            onGeneratePdf={() => handleGeneratePdf('download')}
            onEnviar={() => handleGeneratePdf('email')}
            onCreate={() => {
              catalog.createNew();
              showActiveApem();
            }}
            onOpen={(id) => {
              if (catalog.open(id)) showActiveApem();
            }}
            onDelete={(id) => {
              if (catalog.remove(id)) showActiveApem();
            }}
          />
          <div className="border-b-2 border-border-strong bg-section">
            <SectionNav
              sections={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
              active={active}
              onNavigate={(id) => scrollToSection(id)}
            />
          </div>
        </div>

        <main className="mx-auto max-w-[1100px] px-6 py-6 pb-12">
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
                  <CaratulaForm
                    key={catalog.activeId}
                    onMonedaChange={handleModedaChange}
                  />
                )}
                {s.hash === 'detalle' && <DetalleMensualForm key={catalog.activeId} />}
                {s.hash === 'anexos' && <AnexosActivosForm key={catalog.activeId} />}
              </section>
            ))}
          </form>
        </main>

        {/* Footer sticky */}
        <footer className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-section/90 py-2 text-center text-[11px] text-ink/40 backdrop-blur-sm">
          Correo Argentino © {new Date().getFullYear()} · {APP_VERSION} · Desarrollado con IA
        </footer>

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
  catalog,
  generating,
  pdfAction,
  onReset,
  onGeneratePdf,
  onEnviar,
  onCreate,
  onOpen,
  onDelete,
}: {
  catalog: ApemCatalogApi;
  generating: boolean;
  pdfAction: PdfAction | null;
  onReset: () => void;
  onGeneratePdf: () => void;
  onEnviar: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 bg-accent px-6 py-3 text-white">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className="shrink-0 rounded-sm px-2 py-1.5 leading-none"
          style={{ background: CORREO_AMARILLO }}
        >
          <img
            src="/logo-correo-argentino.png"
            alt="Correo Argentino"
            className="block h-9 w-auto"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[11px] tracking-wider opacity-70">
            AD-OO-0136/01
          </span>
          <span className="truncate text-[15px] font-semibold">
            Aprobación de Proyecto de Erogaciones Mayores
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SaveIndicator
          status={catalog.status}
          lastSavedAt={catalog.lastSavedAt}
        />
        <ApemMenu
          items={catalog.items}
          activeId={catalog.activeId}
          onOpen={onOpen}
          onDelete={onDelete}
        />
        <button
          type="button"
          onClick={onCreate}
          className="rounded-sm border border-white/30 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
        >
          Nuevo APEM
        </button>
        <button
          type="button"
          onClick={catalog.saveNow}
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
          {generating && pdfAction === 'download' ? 'Generando…' : 'Imprimir / PDF'}
        </button>
        <button
          type="button"
          onClick={onEnviar}
          disabled={generating}
          className="flex items-center gap-2 rounded-sm px-4 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: CORREO_AMARILLO }}
        >
          <SendIcon />
          {generating && pdfAction === 'email' ? 'Enviando…' : 'Enviar formulario'}
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

function SendIcon() {
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
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
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
