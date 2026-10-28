import {
  createContext,
  forwardRef,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  AUTORIZACIONES,
  CORREO_AMARILLO,
  labelForModalidad,
  labelForTipoErogacion,
} from '../data/constants';
import {
  computeAnexosTotales,
  computeDetalleTotales,
  computeTotales,
  type AnexoColTotals,
  type AnexoSectionKey,
  type AnexosTotales,
  type DetalleTotales,
  type PerColumn,
} from '../hooks/useCalculatedTotals';
import {
  MESES_KEYS,
  MESES_LABELS,
  type ArchivoMeta,
  type FilaAnexo,
  type Proyecto,
} from '../schemas/proyecto';
import {
  formatDateAR,
  formatMoneyRounded,
  formatMoneyZero,
  formatMonth,
  formatPercent,
  formatUsdFromMilesRounded,
} from '../utils/formatters';

/** Formatea un monto en M$ según la moneda del PDF. Default: millones de pesos. */
const PdfFmtCtx = createContext<(v: number) => string>(formatMoneyRounded);

type Orientation = 'portrait' | 'landscape';

type PageDef = {
  key: string;
  orientation: Orientation;
  content: ReactNode;
};

type Props = {
  values: Proyecto;
};

/**
 * Renderizado read-only para html2canvas + jsPDF.
 * Cada <section data-pdf-page> se captura como una página del PDF. La
 * orientación se pasa en `data-pdf-orientation` y el generador la lee.
 *
 * Estructura del PDF:
 *   1. Resumen ejecutivo — 2 carillas (para impresión doble faz):
 *        · pg 1: nombre del proyecto + cotización + tabla USD + firmas + el
 *          comienzo de Observaciones.
 *        · pg 2: continuación del mismo texto. No se repite lo de la pág. 1.
 *   2. Reporte completo: Carátula (3 pgs), Detalle Mensual, Anexos Activos.
 *      (Las firmas NO se repiten al final del reporte: viven sólo en el
 *       Resumen Ejecutivo.)
 */
export const PdfPreview = forwardRef<HTMLDivElement, Props>(function PdfPreview(
  { values },
  ref
) {
  const totalesCaratula = useMemo(
    () =>
      computeTotales({
        resumenMontos: values.caratula?.resumenMontos,
        detalleInversion: values.caratula?.detalleInversion,
        infoTI: values.caratula?.infoTI,
      }),
    [values.caratula]
  );
  const totalesDetalle = useMemo(
    () => computeDetalleTotales(values.detalleMensual),
    [values.detalleMensual]
  );
  const totalesAnexos = useMemo(
    () => computeAnexosTotales(values.anexosActivos),
    [values.anexosActivos]
  );

  // Un solo texto de observaciones, partido entre las dos carillas: lo que
  // entra en el recuadro de la pág. 1 no se vuelve a imprimir en la pág. 2.
  const fullObs = (values.caratula?.opiniones?.texto ?? '').trim();
  const [obsFit, setObsFit] = useState<{ text: string; count: number } | null>(null);
  const obsBoxRef = useRef<HTMLDivElement>(null);
  const obsFitCount = obsFit?.text === fullObs ? obsFit.count : null;

  useLayoutEffect(() => {
    const measure = () => {
      const box = obsBoxRef.current;
      if (!box) return;
      const count = measureObservacionesFit(box, fullObs);
      setObsFit((prev) =>
        prev?.text === fullObs && prev.count === count ? prev : { text: fullObs, count }
      );
    };
    measure();
    let cancel = false;
    const ready = document.fonts?.ready;
    if (ready) {
      void ready.then(() => {
        if (!cancel) measure();
      });
    }
    return () => {
      cancel = true;
    };
  }, [fullObs]);

  const obsHead = obsFitCount == null ? '' : fullObs.slice(0, obsFitCount);
  const obsTail =
    obsFitCount == null ? fullObs : continuationAfter(fullObs, obsFitCount);
  const showObsHead = fullObs.length === 0 || obsFitCount == null || obsFitCount > 0;
  const obsContinued = showObsHead && obsFitCount != null && obsFitCount > 0;

  const pages = useMemo<PageDef[]>(() => {
    const list: PageDef[] = [];

    // ─── Resumen ejecutivo (primeras páginas del PDF, 2 carillas) ─────────
    // Pensado para imprimirse a doble faz. Las dos cajas de Observaciones
    // son el mismo campo: la pág. 2 sigue donde se cortó la pág. 1.
    list.push({
      key: 'resumen-exec',
      orientation: 'portrait',
      content: (
        <ResumenEjecutivoPage
          values={values}
          totales={totalesCaratula}
          obsText={obsHead}
          showObs={showObsHead}
          obsRef={obsBoxRef}
        />
      ),
    });
    list.push({
      key: 'resumen-exec-autorizaciones',
      orientation: 'portrait',
      content: (
        <ResumenEjecutivoAutorizacionesPage text={obsTail} continued={obsContinued} />
      ),
    });

    // ─── Reporte completo ─────────────────────────────────────────────────
    list.push({
      key: 'caratula-1',
      orientation: 'portrait',
      content: <CaratulaPage1 values={values} />,
    });
    list.push({
      key: 'caratula-1b',
      orientation: 'portrait',
      content: <CaratulaPage1b values={values} />,
    });
    list.push({
      key: 'caratula-2',
      orientation: 'portrait',
      content: <CaratulaPage2 values={values} totales={totalesCaratula} />,
    });
    list.push({
      key: 'caratula-3',
      orientation: 'portrait',
      content: <CaratulaPage3 values={values} totales={totalesCaratula} />,
    });

    list.push({
      key: 'detalle-a',
      orientation: 'landscape',
      content: (
        <DetalleMensualPageA values={values} totales={totalesDetalle} />
      ),
    });
    list.push({
      key: 'detalle-b',
      orientation: 'landscape',
      content: (
        <DetalleMensualPageB values={values} totales={totalesDetalle} />
      ),
    });

    const proyectoNombre =
      values.caratula?.descripcion?.denominacion?.trim() || undefined;
    const cotizacionRef = values.caratula?.cotizacionUsd;
    const isUsd =
      values.caratula?.monedaEntrada === 'usd' &&
      typeof cotizacionRef === 'number' &&
      cotizacionRef > 0;

    const anxMeta: Record<AnexoSectionKey, string> = {
      hardware: 'a1.1 — Detalle de Hardware',
      software: 'a1.2 — Detalle de Software / Licencias',
      desarrollosExternos: 'a1.3 — Desarrollos Externos',
      otrosTecnologicos: 'a1.4 — Otros Egresos Tecnológicos',
      bienesUso: 'a2 — Egresos en Bienes de Uso (no tecnológicos)',
      obras: 'a3 — Egresos en Obras en Edificios Propios',
    };

    const renderBlock = (key: AnexoSectionKey) => (
      <AnexoSubsectionBlock
        key={key}
        title={anxMeta[key]}
        filas={values.anexosActivos?.[key]?.filas ?? []}
        rowTotals={totalesAnexos.sections[key].rowTotals}
        colTotals={totalesAnexos.sections[key].colTotals}
        cotizacion={cotizacionRef}
        isUsd={isUsd}
      />
    );

    const hasRows = (key: AnexoSectionKey) =>
      (values.anexosActivos?.[key]?.filas ?? []).length > 0;

    // Página 1 — a1.1 + a1.2
    if (hasRows('hardware') || hasRows('software')) {
      list.push({
        key: 'anexos-grp-1',
        orientation: 'landscape',
        content: (
          <AnexosGroupPage proyecto={proyectoNombre} isUsd={isUsd}>
            {renderBlock('hardware')}
            {renderBlock('software')}
          </AnexosGroupPage>
        ),
      });
    }

    // Página 2 — a1.3 + a1.4 + Total Tecnológicos
    const techKeys: AnexoSectionKey[] = [
      'hardware',
      'software',
      'desarrollosExternos',
      'otrosTecnologicos',
    ];
    const hasAnyTech = techKeys.some(hasRows);
    if (hasRows('desarrollosExternos') || hasRows('otrosTecnologicos') || hasAnyTech) {
      list.push({
        key: 'anexos-grp-2',
        orientation: 'landscape',
        content: (
          <AnexosGroupPage proyecto={proyectoNombre} isUsd={isUsd}>
            {renderBlock('desarrollosExternos')}
            {renderBlock('otrosTecnologicos')}
            {hasAnyTech && (
              <AnexosTecnologicosBlock
                col={totalesAnexos.totalTecnologicos}
                cotizacion={cotizacionRef}
                isUsd={isUsd}
              />
            )}
          </AnexosGroupPage>
        ),
      });
    }

    // Página 3 — a2 + a3 (Egresos en Bienes de Uso y Obras)
    if (hasRows('bienesUso') || hasRows('obras')) {
      list.push({
        key: 'anexos-grp-3',
        orientation: 'landscape',
        content: (
          <AnexosGroupPage proyecto={proyectoNombre} isUsd={isUsd}>
            {renderBlock('bienesUso')}
            {renderBlock('obras')}
          </AnexosGroupPage>
        ),
      });
    }

    // Las autorizaciones al final del PDF fueron eliminadas a propósito:
    // las firmas viven únicamente en el Resumen Ejecutivo (página 2).

    return list;
  }, [
    values,
    totalesCaratula,
    totalesDetalle,
    totalesAnexos,
    obsHead,
    obsTail,
    showObsHead,
    obsContinued,
  ]);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        color: '#1c1814',
        fontSize: '9pt',
        lineHeight: 1.4,
        background: '#ffffff',
      }}
    >
      {pages.map((p, i) => (
        <Page key={p.key} n={i + 1} total={pages.length} orientation={p.orientation}>
          {p.content}
        </Page>
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Carátula — páginas portrait
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Resumen Ejecutivo (páginas al principio del PDF)
// ═══════════════════════════════════════════════════════════════════════════

function ResumenEjecutivoPage({
  values,
  totales,
  obsText,
  showObs,
  obsRef,
}: {
  values: Proyecto;
  totales: ReturnType<typeof computeTotales>;
  obsText: string;
  showObs: boolean;
  obsRef: Ref<HTMLDivElement>;
}) {
  const c = values.caratula;
  const nombre = c?.descripcion?.denominacion?.trim() || '(sin denominar)';
  const isUsd = c?.monedaEntrada === 'usd';
  const otVacia = !c?.encabezado?.ot?.trim();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0 }}>
      <div
        style={{
          marginTop: '3mm',
          marginBottom: '5mm',
          padding: '4mm 5mm',
          background: '#1a3a5c',
          color: '#ffffff',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6mm',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: '8pt',
              opacity: 0.75,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Resumen ejecutivo — denominación del proyecto
          </div>
          <div
            style={{
              fontSize: '16pt',
              fontWeight: 700,
              marginTop: '1.5mm',
              lineHeight: 1.2,
            }}
          >
            {nombre}
          </div>
        </div>
        <div
          style={{
            flex: '0 0 auto',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: '8pt',
              opacity: 0.75,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            OT
          </div>
          {otVacia ? (
            <div
              style={{
                width: '22mm',
                height: '8mm',
                background: '#ffffff',
                borderRadius: '1px',
                marginTop: '1.5mm',
                marginLeft: 'auto',
              }}
            />
          ) : (
            <div
              style={{
                fontSize: '14pt',
                fontWeight: 700,
                marginTop: '1.5mm',
                lineHeight: 1.2,
              }}
            >
              {c?.encabezado?.ot}
            </div>
          )}
        </div>
      </div>

      {isUsd && (
        <div
          style={{
            marginBottom: '3mm',
            display: 'flex',
            alignItems: 'baseline',
            gap: '3mm',
            fontSize: '10pt',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: '#6b6158',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              fontSize: '8.5pt',
            }}
          >
            Cotización USD:
          </span>
          <span
            style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontWeight: 700,
              color: '#1a3a5c',
            }}
          >
            {formatMoneyZero(c?.cotizacionUsd)}
          </span>
          <span style={{ fontSize: '8.5pt', color: '#6b6158' }}>pesos / USD</span>
        </div>
      )}

      <SectionTitle>
        {isUsd
          ? 'Resumen de Montos Involucrados — USD'
          : 'Resumen de Montos Involucrados'}
      </SectionTitle>
      {isUsd ? (
        <table style={tableBase}>
          <thead>
            <tr>
              <ThUsd align="left" width="38%">
                Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(USD)</span>
              </ThUsd>
              <ThUsd>Año actual</ThUsd>
              <ThUsd>Años siguientes</ThUsd>
              <ThUsd>Total</ThUsd>
              <ThUsd>Presupuesto</ThUsd>
            </tr>
          </thead>
          <tbody>
            <ResumenRowUsd
              label="Ingresos / Ahorros incrementales del proyecto"
              fila={c?.resumenMontos?.ingresosAhorros}
              total={totales.resumen.ingresosAhorrosTotal}
              cotizacion={c?.cotizacionUsd}
            />
            <ResumenRowUsd
              label="Egresos activables (hard, soft, bienes de uso)"
              fila={c?.resumenMontos?.egresosActivables}
              total={totales.resumen.egresosActivablesTotal}
              cotizacion={c?.cotizacionUsd}
            />
            <ResumenRowUsd
              label="Otros egresos activables"
              fila={c?.resumenMontos?.otrosEgresosActivables}
              total={totales.resumen.otrosEgresosActivablesTotal}
              cotizacion={c?.cotizacionUsd}
            />
            <ResumenRowUsd
              label="Gastos adic. no activables"
              fila={c?.resumenMontos?.gastosNoActivables}
              total={totales.resumen.gastosNoActivablesTotal}
              cotizacion={c?.cotizacionUsd}
            />
            <tr>
              <Td style={tdTotalCaratula}>
                Monto total de la erogación (activable + no activable)
              </Td>
              <Td num strong>
                {formatUsdFromMilesRounded(totales.resumen.montoTotalEjActual, c?.cotizacionUsd)}
              </Td>
              <Td num strong>
                {formatUsdFromMilesRounded(totales.resumen.montoTotalEjSiguientes, c?.cotizacionUsd)}
              </Td>
              <Td num strong>
                {formatUsdFromMilesRounded(totales.resumen.montoTotalTotal, c?.cotizacionUsd)}
              </Td>
              <Td num strong>
                {formatUsdFromMilesRounded(totales.resumen.montoTotalPrevisto, c?.cotizacionUsd)}
              </Td>
            </tr>
            <ResumenRowUsd
              label="Gastos incrementales corrientes"
              fila={c?.resumenMontos?.gastosIncrementales}
              total={totales.resumen.gastosIncrementalesTotal}
              cotizacion={c?.cotizacionUsd}
            />
          </tbody>
        </table>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <Th align="left" width="38%">
                Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(Millones de Pesos)</span>
              </Th>
              <Th>Año actual</Th>
              <Th>Años siguientes</Th>
              <Th>Total</Th>
              <Th>Presupuesto</Th>
            </tr>
          </thead>
          <tbody>
            <ResumenRow
              label="Ingresos / Ahorros incrementales del proyecto"
              fila={c?.resumenMontos?.ingresosAhorros}
              total={totales.resumen.ingresosAhorrosTotal}
            />
            <ResumenRow
              label="Egresos activables (hard, soft, bienes de uso)"
              fila={c?.resumenMontos?.egresosActivables}
              total={totales.resumen.egresosActivablesTotal}
            />
            <ResumenRow
              label="Otros egresos activables"
              fila={c?.resumenMontos?.otrosEgresosActivables}
              total={totales.resumen.otrosEgresosActivablesTotal}
            />
            <ResumenRow
              label="Gastos adic. no activables"
              fila={c?.resumenMontos?.gastosNoActivables}
              total={totales.resumen.gastosNoActivablesTotal}
            />
            <tr>
              <Td style={tdTotalCaratula}>
                Monto total de la erogación (activable + no activable)
              </Td>
              <Td num strong>
                {formatMoneyRounded(totales.resumen.montoTotalEjActual)}
              </Td>
              <Td num strong>
                {formatMoneyRounded(totales.resumen.montoTotalEjSiguientes)}
              </Td>
              <Td num strong>
                {formatMoneyRounded(totales.resumen.montoTotalTotal)}
              </Td>
              <Td num strong>
                {formatMoneyRounded(totales.resumen.montoTotalPrevisto)}
              </Td>
            </tr>
            <ResumenRow
              label="Gastos incrementales corrientes"
              fila={c?.resumenMontos?.gastosIncrementales}
              total={totales.resumen.gastosIncrementalesTotal}
            />
          </tbody>
        </table>
      )}

      <SectionTitle>Autorizaciones — Aprobadores de APEM</SectionTitle>
      <Grid cols="repeat(3, 1fr)" gap="3mm">
        {AUTORIZACIONES.slice(0, 6).map((a) => (
          <FirmaBox key={a.key} label={a.label} />
        ))}
      </Grid>
      <div style={{ marginTop: '3mm' }}>
        <FirmaBox label="7. Directorio" />
      </div>

      </div>
      {showObs && (
        <>
          <SectionTitle>Observaciones</SectionTitle>
          <ObservacionesTexto ref={obsRef} text={obsText} part="head" />
        </>
      )}
    </div>
  );
}

/**
 * Caja de firma reutilizable: título arriba, espacio en blanco, línea para
 * firma y campo de fecha.
 */
function FirmaBox({ label }: { label: string }) {
  return (
    <div
      style={{
        border: '1px solid #c8c0b4',
        borderRadius: '2px',
        padding: '2.5mm 3.5mm',
        background: '#ffffff',
        minHeight: '28mm',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontSize: '8pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#1a3a5c',
          letterSpacing: '0.3px',
          borderBottom: '1px solid #c8c0b4',
          paddingBottom: '1.2mm',
          marginBottom: '1.5mm',
          minHeight: '7mm',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          borderBottom: '1px solid #6b6158',
          height: '8mm',
          marginBottom: '1mm',
        }}
      />
      <div
        style={{
          fontSize: '7.5pt',
          color: '#6b6158',
          display: 'flex',
          alignItems: 'baseline',
          gap: '2mm',
        }}
      >
        <span>Fecha:</span>
        <span style={{ flex: 1, borderBottom: '1px solid #c8c0b4' }} />
      </div>
    </div>
  );
}

/**
 * Segunda hoja del Resumen Ejecutivo. Mismo campo que Observaciones de la
 * pág. 1: acá solo va el texto que no entró arriba.
 */
function ResumenEjecutivoAutorizacionesPage({
  text,
  continued,
}: {
  text: string;
  continued: boolean;
}) {
  return (
    <>
      <SectionTitle>{continued ? 'Observaciones (cont.)' : 'Observaciones'}</SectionTitle>
      <ObservacionesTexto text={text} part="tail" />
    </>
  );
}

const OBS_BREAK_WINDOW = 48;

/** Quita el espacio o salto de línea donde se cortó el texto, sin comerse el resto. */
function continuationAfter(full: string, cut: number): string {
  const tail = full.slice(cut);
  if (tail.startsWith('\r\n')) return tail.slice(2);
  if (tail.startsWith('\n') || tail.startsWith('\r') || tail.startsWith(' ')) {
    return tail.slice(1);
  }
  return tail;
}

function snapObservacionesCut(text: string, count: number): number {
  if (count <= 0 || count >= text.length) return count;
  const prev = text[count - 1];
  const next = text[count];
  const boundary = prev === ' ' || prev === '\n' || prev === '\r' || next === ' ' || next === '\n' || next === '\r';
  if (boundary) return count;
  const start = Math.max(0, count - OBS_BREAK_WINDOW);
  const slice = text.slice(start, count);
  const rel = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
  if (rel < 0) return count;
  const snapped = start + rel;
  return snapped > 0 ? snapped : count;
}

/** Cuántos caracteres del texto entran en el recuadro de la pág. 1. */
function measureObservacionesFit(box: HTMLElement, text: string): number {
  const inner = box.querySelector<HTMLElement>('[data-obs-inner]');
  if (!inner) return 0;
  if (!text) {
    inner.textContent = '';
    return 0;
  }
  const limit = observacionesContentLimit(box);
  if (limit < 8) {
    inner.textContent = '';
    return 0;
  }
  const fits = (count: number) => {
    inner.textContent = text.slice(0, count);
    return inner.scrollHeight <= limit;
  };
  let count: number;
  if (fits(text.length)) {
    count = text.length;
  } else {
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(mid)) lo = mid;
      else hi = mid - 1;
    }
    count = lo;
    const snapped = snapObservacionesCut(text, count);
    if (snapped !== count && fits(snapped)) count = snapped;
  }
  inner.textContent = text.slice(0, count);
  return count;
}

function observacionesContentLimit(box: HTMLElement): number {
  const page = box.closest('[data-pdf-page]');
  if (!page) return 0;
  const style = getComputedStyle(box);
  const padTop = Number.parseFloat(style.paddingTop) || 0;
  const padBottom = Number.parseFloat(style.paddingBottom) || 0;
  const pageRect = page.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (boxRect.top >= pageRect.bottom - 1) return 0;
  const contentHeight = box.clientHeight - padTop - padBottom;
  const overflowBelow = Math.max(0, boxRect.bottom - pageRect.bottom);
  return contentHeight - overflowBelow;
}

const ObservacionesTexto = forwardRef<
  HTMLDivElement,
  { text: string; part: 'head' | 'tail' }
>(function ObservacionesTexto({ text, part }, ref) {
  return (
    <div
      ref={ref}
      data-obs-part={part}
      style={{
        border: '1px solid #c8c0b4',
        borderRadius: '2px',
        padding: '3mm 4mm',
        background: '#ffffff',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
        fontSize: '9pt',
        lineHeight: 1.45,
      }}
    >
      <div data-obs-inner style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {text}
      </div>
    </div>
  );
});

function CaratulaPage1({ values }: { values: Proyecto }) {
  const c = values.caratula;
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Encabezado</SectionTitle>
      <KV>
        <KVRow label="Fecha" value={formatDateAR(c?.encabezado?.fecha)} />
        <KVRow label="Subdirección" value={c?.encabezado?.subdireccion || '—'} />
        <KVRow label="Dirección" value={c?.encabezado?.direccion || '—'} />
        <KVRow label="Gerencia" value={c?.encabezado?.gerencia || '—'} />
        <KVRow label="OT" value={c?.encabezado?.ot || ''} />
      </KV>

      <SectionTitle>A. Descripción General</SectionTitle>
      <KV fill>
        <KVRow
          label="Denominación del proyecto"
          value={c?.descripcion?.denominacion || '—'}
          bold
        />
        <KVBlock label="Descripción" fill>
          <Paragraph text={c?.descripcion?.descripcion} />
          <AnexoFlag on={c?.descripcion?.descripcionIncluyeAnexo} files={c?.descripcion?.descripcionAnexos} />
        </KVBlock>
      </KV>
    </>
  );
}

function CaratulaPage1b({ values }: { values: Proyecto }) {
  const c = values.caratula;
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula (cont.)" />
      <SectionTitle>A. Descripción General (cont.)</SectionTitle>
      <KV fill>
        <KVBlock label="Objetivos y justificación" fill>
          <Paragraph text={c?.descripcion?.objetivos} />
          <AnexoFlag on={c?.descripcion?.objetivosIncluyeAnexo} files={c?.descripcion?.objetivosAnexos} />
        </KVBlock>
        <KVRow
          label="Tipo de erogación"
          value={labelForTipoErogacion(c?.descripcion?.tipoErogacion) || '—'}
        />
        <KVRow
          label="Modalidad de evaluación"
          value={labelForModalidad(c?.descripcion?.modalidadEvaluacion) || '—'}
        />
      </KV>
    </>
  );
}

function CaratulaPage2({
  values,
  totales,
}: {
  values: Proyecto;
  totales: ReturnType<typeof computeTotales>;
}) {
  const c = values.caratula;
  const isUsd = c?.monedaEntrada === 'usd';
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Características Básicas</SectionTitle>
      <Grid cols="repeat(3, 1fr)">
        <MiniField
          label="Año y mes de inicio del proyecto"
          value={formatMonth(c?.caracteristicas?.mesInicio) || '—'}
        />
        <MiniField
          label="Año y mes de finalización de la erogación"
          value={formatMonth(c?.caracteristicas?.mesFinErogacion) || '—'}
        />
        <MiniField
          label="Año y mes de finalización del proyecto"
          value={formatMonth(c?.caracteristicas?.mesFinProyecto) || '—'}
        />
      </Grid>

      <SectionTitle>Resumen de Montos Involucrados</SectionTitle>
      <div
        style={{
          marginBottom: '2.5mm',
          display: 'flex',
          alignItems: 'baseline',
          gap: '3mm',
          fontSize: '9pt',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: '#6b6158',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontSize: '8pt',
          }}
        >
          Cotización USD:
        </span>
        <span
          style={{
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontWeight: 600,
            color: '#1a3a5c',
          }}
        >
          {formatMoneyZero(c?.cotizacionUsd)}
        </span>
        <span style={{ fontSize: '8pt', color: '#6b6158' }}>pesos / USD</span>
      </div>
      <Note>Importes en {isUsd ? 'USD (moneda de ingreso)' : 'Millones de Pesos (M$)'}. Se incluye equivalente en {isUsd ? 'M$' : 'USD'} como referencia.</Note>

      {/* Tabla principal — moneda de ingreso */}
      {isUsd ? (
        <table style={tableBase}>
          <thead>
            <tr>
              <ThUsd align="left" width="38%">
                Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(USD)</span>
              </ThUsd>
              <ThUsd>Ej. Actual</ThUsd>
              <ThUsd>Ej. Siguientes</ThUsd>
              <ThUsd>Total</ThUsd>
              <ThUsd>Presupuesto</ThUsd>
            </tr>
          </thead>
          <tbody>
            <ResumenRowUsd label="Ingresos / Ahorros incrementales del proyecto" fila={c?.resumenMontos?.ingresosAhorros} total={totales.resumen.ingresosAhorrosTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Egresos activables (hard, soft, bienes de uso)" fila={c?.resumenMontos?.egresosActivables} total={totales.resumen.egresosActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Otros egresos activables" fila={c?.resumenMontos?.otrosEgresosActivables} total={totales.resumen.otrosEgresosActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Gastos adic. no activables" fila={c?.resumenMontos?.gastosNoActivables} total={totales.resumen.gastosNoActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <tr>
              <Td style={tdTotalCaratula}>Monto total de la erogación (activable + no activable)</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalEjActual, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalEjSiguientes, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalTotal, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalPrevisto, c?.cotizacionUsd)}</Td>
            </tr>
            <ResumenRowUsd label="Gastos incrementales corrientes" fila={c?.resumenMontos?.gastosIncrementales} total={totales.resumen.gastosIncrementalesTotal} cotizacion={c?.cotizacionUsd} />
          </tbody>
        </table>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <Th align="left" width="38%">Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(M$)</span></Th>
              <Th>Ej. Actual</Th>
              <Th>Ej. Siguientes</Th>
              <Th>Total</Th>
              <Th>Presupuesto</Th>
            </tr>
          </thead>
          <tbody>
            <ResumenRow label="Ingresos / Ahorros incrementales del proyecto" fila={c?.resumenMontos?.ingresosAhorros} total={totales.resumen.ingresosAhorrosTotal} />
            <ResumenRow label="Egresos activables (hard, soft, bienes de uso)" fila={c?.resumenMontos?.egresosActivables} total={totales.resumen.egresosActivablesTotal} />
            <ResumenRow label="Otros egresos activables" fila={c?.resumenMontos?.otrosEgresosActivables} total={totales.resumen.otrosEgresosActivablesTotal} />
            <ResumenRow label="Gastos adic. no activables" fila={c?.resumenMontos?.gastosNoActivables} total={totales.resumen.gastosNoActivablesTotal} />
            <tr>
              <Td style={tdTotalCaratula}>Monto total de la erogación (activable + no activable)</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalEjActual)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalEjSiguientes)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalTotal)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalPrevisto)}</Td>
            </tr>
            <ResumenRow label="Gastos incrementales corrientes" fila={c?.resumenMontos?.gastosIncrementales} total={totales.resumen.gastosIncrementalesTotal} />
          </tbody>
        </table>
      )}

      {/* Tabla referencia — moneda opuesta */}
      <div style={{ marginTop: '3mm', marginBottom: '1.5mm', fontSize: '7.5pt', color: '#6b6158', fontStyle: 'italic' }}>
        {isUsd ? 'Referencia en Millones de Pesos (M$)' : 'Equivalente en USD — calculado sobre la cotización ingresada.'}
      </div>
      {isUsd ? (
        <table style={tableBase}>
          <thead>
            <tr>
              <Th align="left" width="38%">Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(M$)</span></Th>
              <Th>Ej. Actual</Th><Th>Ej. Siguientes</Th><Th>Total</Th><Th>Presupuesto</Th>
            </tr>
          </thead>
          <tbody>
            <ResumenRow label="Ingresos / Ahorros incrementales del proyecto" fila={c?.resumenMontos?.ingresosAhorros} total={totales.resumen.ingresosAhorrosTotal} />
            <ResumenRow label="Egresos activables (hard, soft, bienes de uso)" fila={c?.resumenMontos?.egresosActivables} total={totales.resumen.egresosActivablesTotal} />
            <ResumenRow label="Otros egresos activables" fila={c?.resumenMontos?.otrosEgresosActivables} total={totales.resumen.otrosEgresosActivablesTotal} />
            <ResumenRow label="Gastos adic. no activables" fila={c?.resumenMontos?.gastosNoActivables} total={totales.resumen.gastosNoActivablesTotal} />
            <tr>
              <Td style={tdTotalCaratula}>Monto total de la erogación (activable + no activable)</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalEjActual)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalEjSiguientes)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalTotal)}</Td>
              <Td num strong>{formatMoneyRounded(totales.resumen.montoTotalPrevisto)}</Td>
            </tr>
            <ResumenRow label="Gastos incrementales corrientes" fila={c?.resumenMontos?.gastosIncrementales} total={totales.resumen.gastosIncrementalesTotal} />
          </tbody>
        </table>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <ThUsd align="left" width="38%">Concepto <span style={{ fontWeight: 400, opacity: 0.75 }}>(USD)</span></ThUsd>
              <ThUsd>Ej. Actual</ThUsd><ThUsd>Ej. Siguientes</ThUsd><ThUsd>Total</ThUsd><ThUsd>Presupuesto</ThUsd>
            </tr>
          </thead>
          <tbody>
            <ResumenRowUsd label="Ingresos / Ahorros incrementales del proyecto" fila={c?.resumenMontos?.ingresosAhorros} total={totales.resumen.ingresosAhorrosTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Egresos activables (hard, soft, bienes de uso)" fila={c?.resumenMontos?.egresosActivables} total={totales.resumen.egresosActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Otros egresos activables" fila={c?.resumenMontos?.otrosEgresosActivables} total={totales.resumen.otrosEgresosActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <ResumenRowUsd label="Gastos adic. no activables" fila={c?.resumenMontos?.gastosNoActivables} total={totales.resumen.gastosNoActivablesTotal} cotizacion={c?.cotizacionUsd} />
            <tr>
              <Td style={tdTotalCaratula}>Monto total de la erogación (activable + no activable)</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalEjActual, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalEjSiguientes, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalTotal, c?.cotizacionUsd)}</Td>
              <Td num strong>{formatUsdFromMilesRounded(totales.resumen.montoTotalPrevisto, c?.cotizacionUsd)}</Td>
            </tr>
            <ResumenRowUsd label="Gastos incrementales corrientes" fila={c?.resumenMontos?.gastosIncrementales} total={totales.resumen.gastosIncrementalesTotal} cotizacion={c?.cotizacionUsd} />
          </tbody>
        </table>
      )}
    </>
  );
}

function CaratulaPage3({
  values,
  totales,
}: {
  values: Proyecto;
  totales: ReturnType<typeof computeTotales>;
}) {
  const c = values.caratula;
  const isUsd = c?.monedaEntrada === 'usd';
  const cot = c?.cotizacionUsd;

  // Renderiza una línea de ítem en la moneda seleccionada + referencia opuesta
  const ItemLine = ({ label, v }: { label: string; v: number | null | undefined }) =>
    isUsd ? (
      <MoneyLineUsd label={label} v={v} cotizacion={cot} />
    ) : (
      <MoneyLine label={label} v={v} />
    );

  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Detalle del Monto Total a Invertir (en moneda ingresada)</SectionTitle>
      <Grid cols="1fr 1fr">
        <Box title="Activable">
          <ItemLine label="1. Hardware" v={c?.detalleInversion?.activable?.hardware} />
          <ItemLine label="2. Software" v={c?.detalleInversion?.activable?.software} />
          <ItemLine label="3. Otros" v={c?.detalleInversion?.activable?.otros} />
          {isUsd ? (
            <>
              <MoneyLineUsd label="Total activable (USD)" v={totales.detalle.totalActivable} cotizacion={cot} emphasize={false} />
              <MoneyLine label="Total activable (M$)" v={totales.detalle.totalActivable} total />
            </>
          ) : (
            <>
              <MoneyLine label="Total activable (M$)" v={totales.detalle.totalActivable} total />
              <MoneyLineUsd label="Total activable (USD)" v={totales.detalle.totalActivable} cotizacion={cot} />
            </>
          )}

          <Subheader>No activable</Subheader>
          {(c?.detalleInversion?.noActivable ?? []).length === 0 && (
            <EmptyNote>Sin conceptos cargados.</EmptyNote>
          )}
          {(c?.detalleInversion?.noActivable ?? []).map((it, i) => (
            <ItemLine
              key={it.id ?? i}
              label={it.concepto?.trim() || `Concepto ${i + 1}`}
              v={it.monto}
            />
          ))}
          {isUsd ? (
            <>
              <MoneyLineUsd label="Total no activable (USD)" v={totales.detalle.totalNoActivable} cotizacion={cot} />
              <MoneyLine label="Total no activable (M$)" v={totales.detalle.totalNoActivable} total />
              <MoneyLineUsd label="Total costo de la erogación (USD)" v={totales.detalle.totalInversion} cotizacion={cot} emphasize />
              <MoneyLine label="Total costo de la erogación (M$)" v={totales.detalle.totalInversion} emphasize />
            </>
          ) : (
            <>
              <MoneyLine label="Total no activable (M$)" v={totales.detalle.totalNoActivable} total />
              <MoneyLineUsd label="Total no activable (USD)" v={totales.detalle.totalNoActivable} cotizacion={cot} />
              <MoneyLine label="Total costo de la erogación (M$)" v={totales.detalle.totalInversion} emphasize />
              <MoneyLineUsd label="Total costo de la erogación (USD)" v={totales.detalle.totalInversion} cotizacion={cot} emphasize />
            </>
          )}
        </Box>

        <Box title="Gastos Incrementales Corrientes">
          {(c?.detalleInversion?.gastosIncrementales ?? []).length === 0 && (
            <EmptyNote>Sin conceptos cargados.</EmptyNote>
          )}
          {(c?.detalleInversion?.gastosIncrementales ?? []).map((it, i) => (
            <ItemLine
              key={it.id ?? i}
              label={it.concepto?.trim() || `Concepto ${i + 1}`}
              v={it.monto}
            />
          ))}
          {isUsd ? (
            <>
              <MoneyLineUsd label="Total gastos incrementales (USD)" v={totales.detalle.totalGastosIncrementales} cotizacion={cot} />
              <MoneyLine label="Total gastos incrementales (M$)" v={totales.detalle.totalGastosIncrementales} total />
            </>
          ) : (
            <>
              <MoneyLine label="Total gastos incrementales (M$)" v={totales.detalle.totalGastosIncrementales} total />
              <MoneyLineUsd label="Total gastos incrementales (USD)" v={totales.detalle.totalGastosIncrementales} cotizacion={cot} />
            </>
          )}
        </Box>
      </Grid>

      <SectionTitle>Información Complementaria sobre Proyectos Informáticos</SectionTitle>
      <Grid cols="1fr 1fr">
        <Box title="Costos de Hardware">
          <ItemLine label="1. Costo de equipos informáticos" v={c?.infoTI?.hardware?.equipos} />
          <ItemLine label="2. Costos de instalación" v={c?.infoTI?.hardware?.instalacion} />
          <ItemLine label="3. Otros costos" v={c?.infoTI?.hardware?.otros} />
          {isUsd ? (
            <>
              <MoneyLineUsd label="Total costos Hardware (USD)" v={totales.ti.totalHardware} cotizacion={cot} />
              <MoneyLine label="Total costos Hardware (M$)" v={totales.ti.totalHardware} total />
            </>
          ) : (
            <>
              <MoneyLine label="Total costos Hardware (M$)" v={totales.ti.totalHardware} total />
              <MoneyLineUsd label="Total costos Hardware (USD)" v={totales.ti.totalHardware} cotizacion={cot} />
            </>
          )}
        </Box>
        <Box title="Costos de Software">
          <ItemLine label="1. Licencias" v={c?.infoTI?.software?.licencias} />
          <ItemLine label="2. Apoyo externo" v={c?.infoTI?.software?.apoyoExterno} />
          <ItemLine label="3. Otros costos" v={c?.infoTI?.software?.otros} />
          {isUsd ? (
            <>
              <MoneyLineUsd label="Total costos Software (USD)" v={totales.ti.totalSoftware} cotizacion={cot} />
              <MoneyLine label="Total costos Software (M$)" v={totales.ti.totalSoftware} total />
              <MoneyLineUsd label="Total Hardware + Software (USD)" v={totales.ti.totalHwSw} cotizacion={cot} emphasize />
              <MoneyLine label="Total Hardware + Software (M$)" v={totales.ti.totalHwSw} emphasize />
            </>
          ) : (
            <>
              <MoneyLine label="Total costos Software (M$)" v={totales.ti.totalSoftware} total />
              <MoneyLineUsd label="Total costos Software (USD)" v={totales.ti.totalSoftware} cotizacion={cot} />
              <MoneyLine label="Total Hardware + Software (M$)" v={totales.ti.totalHwSw} emphasize />
              <MoneyLineUsd label="Total Hardware + Software (USD)" v={totales.ti.totalHwSw} cotizacion={cot} emphasize />
            </>
          )}
        </Box>
      </Grid>

      <SectionTitle>B. Resultados de la Evaluación Económica</SectionTitle>
      <Grid cols="repeat(2, 1fr)" gap="3mm">
        <MiniField
          label="Horizonte de la evaluación (meses)"
          value={c?.evaluacion?.horizonteMeses?.toString() || '—'}
        />
        <MiniField
          label="Tasa Interna de Retorno anual (TIR)"
          value={formatPercent(c?.evaluacion?.tir) || '—'}
        />
        <MiniField
          label="Tasa de corte"
          value={formatPercent(c?.evaluacion?.tasaCorte) || '—'}
        />
        <MiniField
          label={`VAN (${isUsd ? 'USD' : 'M$'})`}
          value={formatMoneyZero(c?.evaluacion?.van)}
        />
        <MiniField
          label="Período de repago (meses)"
          value={c?.evaluacion?.periodoRepagoMeses?.toString() || '—'}
        />
      </Grid>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Detalle Mensual — 1 página landscape
// ═══════════════════════════════════════════════════════════════════════════

const DETALLE_COL_WIDTH_MES = '13mm';
const DETALLE_COL_WIDTH_CONCEPTO = '60mm';
const DETALLE_COL_WIDTH_TOTAL = '20mm';
const DETALLE_COLSPAN = 14;

/** Colgroup + thead reutilizados por las dos páginas de Detalle Mensual. */
function DetalleTableHead() {
  return (
    <>
      <colgroup>
        <col style={{ width: DETALLE_COL_WIDTH_CONCEPTO }} />
        {MESES_KEYS.map((m) => (
          <col key={m} style={{ width: DETALLE_COL_WIDTH_MES }} />
        ))}
        <col style={{ width: DETALLE_COL_WIDTH_TOTAL }} />
      </colgroup>
      <thead>
        <tr>
          <ThSmall align="left">Concepto</ThSmall>
          {MESES_KEYS.map((m) => (
            <ThSmall key={m}>{MESES_LABELS[m]}</ThSmall>
          ))}
          <ThSmall highlight>Total año</ThSmall>
        </tr>
      </thead>
    </>
  );
}

function DetalleMensualPageA({
  values,
  totales,
}: {
  values: Proyecto;
  totales: DetalleTotales;
}) {
  const dm = values.detalleMensual;
  const inv = dm?.inversion;
  const proyecto = values.caratula?.descripcion?.denominacion?.trim() || '—';
  const isUsd = values.caratula?.monedaEntrada === 'usd';
  const cotizacion = values.caratula?.cotizacionUsd;
  const cotizacionValida = typeof cotizacion === 'number' && cotizacion > 0;
  const fmt = (mills: number): string =>
    isUsd && cotizacionValida
      ? formatUsdFromMilesRounded(mills, cotizacion)
      : formatMoneyRounded(mills);
  return (
    <PdfFmtCtx.Provider value={fmt}>
      <PageHeadingRow tag="②" title={`Detalle Mensual — ${proyecto}`} />
      <Note>
        Importes en {isUsd ? 'USD' : 'Millones de Pesos (M$)'}. Parte{' '}
        <strong>a) Detalle de la Erogación</strong> — el impacto económico se
        muestra en la página siguiente.
      </Note>
      <table style={{ ...tableBase, fontSize: '6.5pt', tableLayout: 'fixed' }}>
        <DetalleTableHead />
        <tbody>
          <SectionBandRow label="a) Detalle de la Erogación" />
          <SubBandRow label="a.1) Egresos presumiblemente activables" />
          <GroupBandRow label="1. Egresos en Tecnología de Sistemas" />
          <DataBandRow
            number="1.1"
            label={labelOr(inv?.tecnologia?.hardware?.label, 'Hardware')}
            meses={inv?.tecnologia?.hardware?.meses}
            total={totales.rowTotals.hardware}
          />
          <DataBandRow
            number="1.2"
            label={labelOr(inv?.tecnologia?.software?.label, 'Software')}
            meses={inv?.tecnologia?.software?.meses}
            total={totales.rowTotals.software}
          />
          <DataBandRow
            number="1.3"
            label={labelOr(inv?.tecnologia?.licencias?.label, 'Licencias')}
            meses={inv?.tecnologia?.licencias?.meses}
            total={totales.rowTotals.licencias}
          />
          <DataBandRow
            number="1.4"
            label={labelOr(inv?.tecnologia?.apoyoExterno?.label, 'Apoyo externo')}
            meses={inv?.tecnologia?.apoyoExterno?.meses}
            total={totales.rowTotals.apoyoExterno}
          />
          <DataBandRow
            number="1.5"
            label={labelOr(inv?.tecnologia?.otros?.label, 'Otros')}
            meses={inv?.tecnologia?.otros?.meses}
            total={totales.rowTotals.otros}
          />

          <GroupBandRow label="2. Egresos en bienes de uso varios" />
          <DataBandRow
            number="2.1"
            label={labelOr(inv?.bienesUso?.fila1?.label, 'Detallar')}
            meses={inv?.bienesUso?.fila1?.meses}
            total={totales.rowTotals.bienesUso1}
          />
          <DataBandRow
            number="2.2"
            label={labelOr(inv?.bienesUso?.fila2?.label, 'Detallar')}
            meses={inv?.bienesUso?.fila2?.meses}
            total={totales.rowTotals.bienesUso2}
          />

          <GroupBandRow label="3. Egresos en Obras (no mantenimiento)" />
          <DataBandRow
            number="3.1"
            label={labelOr(inv?.obras?.fila1?.label, 'Detallar')}
            meses={inv?.obras?.fila1?.meses}
            total={totales.rowTotals.obras1}
          />
          <DataBandRow
            number="3.2"
            label={labelOr(inv?.obras?.fila2?.label, 'Detallar')}
            meses={inv?.obras?.fila2?.meses}
            total={totales.rowTotals.obras2}
          />

          <TotalBandRow label="Total a.1" per={totales.totalA1} />

          <SubBandRow label="a.2) Egresos no activables" />
          <DataBandRow
            number="4"
            label={labelOr(dm?.noActivable?.capacitacion?.label, 'Capacitación externa')}
            meses={dm?.noActivable?.capacitacion?.meses}
            total={totales.rowTotals.capacitacion}
          />
          <DataBandRow
            number="5"
            label={labelOr(dm?.noActivable?.movilidades?.label, 'Movilidades')}
            meses={dm?.noActivable?.movilidades?.meses}
            total={totales.rowTotals.movilidades}
          />
          <DataBandRow
            number="6"
            label={labelOr(
              dm?.noActivable?.refacciones?.label,
              'Refacciones y obras menores no activables'
            )}
            meses={dm?.noActivable?.refacciones?.meses}
            total={totales.rowTotals.refacciones}
          />
          <DataBandRow
            number="7"
            label={labelOr(dm?.noActivable?.otros?.label, 'Otros (detallar)')}
            meses={dm?.noActivable?.otros?.meses}
            total={totales.rowTotals.otrosNoActivable}
          />

          <TotalBandRow label="Total a.2" per={totales.totalA2} />
          <TotalBandRow
            label="TOTAL DE LA EROGACIÓN (a.1 + a.2)"
            per={totales.totalInversion}
            strong
          />
        </tbody>
      </table>
    </PdfFmtCtx.Provider>
  );
}

function DetalleMensualPageB({
  values,
  totales,
}: {
  values: Proyecto;
  totales: DetalleTotales;
}) {
  const dm = values.detalleMensual;
  const proyecto = values.caratula?.descripcion?.denominacion?.trim() || '—';
  const isUsd = values.caratula?.monedaEntrada === 'usd';
  const cotizacion = values.caratula?.cotizacionUsd;
  const cotizacionValida = typeof cotizacion === 'number' && cotizacion > 0;
  const fmt = (mills: number): string =>
    isUsd && cotizacionValida
      ? formatUsdFromMilesRounded(mills, cotizacion)
      : formatMoneyRounded(mills);
  return (
    <PdfFmtCtx.Provider value={fmt}>
      <PageHeadingRow tag="②" title={`Detalle Mensual — ${proyecto}`} />
      <Note>
        Importes en {isUsd ? 'USD' : 'Millones de Pesos (M$)'}. Parte{' '}
        <strong>b) Impacto Económico de la Erogación</strong> — el detalle de
        la erogación está en la página anterior.
      </Note>
      <table style={{ ...tableBase, fontSize: '6.5pt', tableLayout: 'fixed' }}>
        <DetalleTableHead />
        <tbody>
          <SectionBandRow label="b) Impacto Económico de la Erogación" />
          <DataBandRow
            number="b.1"
            label="Ingresos Incrementales (Venta)"
            meses={dm?.impacto?.ingresosIncrementales?.meses}
            total={totales.rowTotals.ingresosIncrementales}
          />
          <DataBandRow
            number="b.2"
            label="Ahorro en Gastos Corrientes"
            meses={dm?.impacto?.ahorroGastos?.meses}
            total={totales.rowTotals.ahorroGastos}
          />
          <MirrorBandRow label="b.3) Erogación no activable (= a.2)" per={totales.b3} />
          <DataBandRow
            number="b.4"
            label="Gastos Corrientes que ocasionará el proyecto"
            meses={dm?.impacto?.gastosCorrientes?.meses}
            total={totales.rowTotals.gastosCorrientes}
          />
          <DataBandRow
            number="b.5"
            label="Amortización de la erogación activable"
            meses={dm?.impacto?.amortizacion?.meses}
            total={totales.rowTotals.amortizacion}
          />

          <TotalBandRow
            label="TOTAL IMPACTO EN RESULTADO (b.1 + b.2 − b.3 − b.4 − b.5)"
            per={totales.totalImpacto}
            strong
          />
        </tbody>
      </table>
    </PdfFmtCtx.Provider>
  );
}

function labelOr(custom: string | undefined, fallback: string): string {
  const t = (custom ?? '').trim();
  return t || fallback;
}

// ═══════════════════════════════════════════════════════════════════════════
// Anexos Activos — N páginas landscape
// ═══════════════════════════════════════════════════════════════════════════

const ANEXO_COLGROUP = (
  <colgroup>
    <col style={{ width: '40mm' }} />
    <col style={{ width: '11mm' }} />
    <col style={{ width: '18mm' }} />
    <col style={{ width: '20mm' }} />
    {MESES_KEYS.map((m) => (
      <col key={m} style={{ width: '10.5mm' }} />
    ))}
    <col style={{ width: '18mm' }} />
    <col style={{ width: '13mm' }} />
    <col style={{ width: '13mm' }} />
  </colgroup>
);

/**
 * Bloque de sub-sección de anexos (banner + tabla). Sin PageHeadingRow ni
 * Note — los agrupa el contenedor `AnexosGroupPage`.
 */
function AnexoSubsectionBlock({
  title,
  filas,
  rowTotals,
  colTotals,
  cotizacion,
  isUsd = false,
}: {
  title: string;
  filas: FilaAnexo[];
  rowTotals: Record<string, { costoTotal: number; totalAnual: number }>;
  colTotals: AnexoColTotals;
  cotizacion: number | null | undefined;
  isUsd?: boolean;
}) {
  const fmt = (v: number | null | undefined) =>
    isUsd ? formatUsdFromMilesRounded(v, cotizacion) : formatMoneyRounded(v);
  return (
    <>
      <div
        style={{
          background: '#eae6e0',
          borderLeft: '4px solid #1a3a5c',
          marginBottom: '1.5mm',
          padding: '1.5mm 3mm',
          fontSize: '8.5pt',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#1a3a5c',
          letterSpacing: '0.3px',
          lineHeight: 1.4,
          flexShrink: 0,
        }}
      >
        {title}
        <br />
        {' '}
      </div>
      <table
        style={{
          ...tableBase,
          fontSize: '6.5pt',
          tableLayout: 'fixed',
          marginBottom: '3mm',
        }}
      >
        {ANEXO_COLGROUP}
        <thead>
          <tr>
            <ThSmall align="left">Concepto</ThSmall>
            <ThSmall>Cant.</ThSmall>
            <ThSmall>Cto. unit.</ThSmall>
            <ThSmall highlight>Costo Total</ThSmall>
            {MESES_KEYS.map((m) => (
              <ThSmall key={m}>{MESES_LABELS[m]}</ThSmall>
            ))}
            <ThSmall highlight>Total año</ThSmall>
            <ThSmall>Año +1</ThSmall>
            <ThSmall>Año +2</ThSmall>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td
                colSpan={20}
                style={{
                  padding: '2mm',
                  fontSize: '7pt',
                  fontStyle: 'italic',
                  color: '#b0a898',
                  textAlign: 'center',
                }}
              >
                Sin filas cargadas.
              </td>
            </tr>
          )}
          {filas.map((f) => {
            const rt = rowTotals[f.id] ?? { costoTotal: 0, totalAnual: 0 };
            return (
              <tr key={f.id}>
                <TdS>{f.concepto?.trim() || '—'}</TdS>
                <TdS num>
                  {f.cantidad !== undefined && f.cantidad !== null
                    ? String(f.cantidad)
                    : '—'}
                </TdS>
                <TdS num>{fmt(f.costoUnitario)}</TdS>
                <TdS num highlight>{fmt(rt.costoTotal)}</TdS>
                {MESES_KEYS.map((m) => (
                  <TdS key={m} num>{fmt(f.meses?.[m] ?? 0)}</TdS>
                ))}
                <TdS num highlight>{fmt(rt.totalAnual)}</TdS>
                <TdS num>{fmt(f.anioMas1 ?? 0)}</TdS>
                <TdS num>{fmt(f.anioMas2 ?? 0)}</TdS>
              </tr>
            );
          })}
          {filas.length > 0 && (
            <>
              {/* Fila total primaria — moneda de ingreso */}
              <tr>
                <TdS strong>{isUsd ? 'Total (USD)' : 'Total (M$)'}</TdS>
                <TdS strong /><TdS strong />
                <TdS num strong highlight>{fmt(colTotals.costoTotal)}</TdS>
                {MESES_KEYS.map((m) => (
                  <TdS key={m} num strong>{fmt(colTotals.meses[m])}</TdS>
                ))}
                <TdS num strong highlight>{fmt(colTotals.totalAnual)}</TdS>
                <TdS num strong>{fmt(colTotals.anioMas1)}</TdS>
                <TdS num strong>{fmt(colTotals.anioMas2)}</TdS>
              </tr>
              {/* Fila total referencia — moneda opuesta */}
              <tr>
                <TdS strong highlight>{isUsd ? 'Total (M$)' : 'Total (USD)'}</TdS>
                <TdS highlight /><TdS highlight />
                <TdS num strong highlight>
                  {isUsd ? formatMoneyRounded(colTotals.costoTotal) : formatUsdFromMilesRounded(colTotals.costoTotal, cotizacion)}
                </TdS>
                {MESES_KEYS.map((m) => (
                  <TdS key={m} num strong highlight>
                    {isUsd ? formatMoneyRounded(colTotals.meses[m]) : formatUsdFromMilesRounded(colTotals.meses[m], cotizacion)}
                  </TdS>
                ))}
                <TdS num strong highlight>
                  {isUsd ? formatMoneyRounded(colTotals.totalAnual) : formatUsdFromMilesRounded(colTotals.totalAnual, cotizacion)}
                </TdS>
                <TdS num strong highlight>
                  {isUsd ? formatMoneyRounded(colTotals.anioMas1) : formatUsdFromMilesRounded(colTotals.anioMas1, cotizacion)}
                </TdS>
                <TdS num strong highlight>
                  {isUsd ? formatMoneyRounded(colTotals.anioMas2) : formatUsdFromMilesRounded(colTotals.anioMas2, cotizacion)}
                </TdS>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </>
  );
}

function AnexosTecnologicosBlock({
  col,
  cotizacion,
  isUsd = false,
}: {
  col: AnexoColTotals;
  cotizacion: number | null | undefined;
  isUsd?: boolean;
}) {
  const fmt = (v: number | null | undefined) =>
    isUsd ? formatUsdFromMilesRounded(v, cotizacion) : formatMoneyRounded(v);
  return (
    <>
      <div
        style={{
          background: '#1a3a5c',
          borderRadius: '1px',
          marginBottom: '1.5mm',
          padding: '1.5mm 3mm',
          color: '#ffffff',
          fontSize: '8.5pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          lineHeight: 1.4,
          flexShrink: 0,
        }}
      >
        TOTAL ACTIVOS TECNOLÓGICOS (a1.1 + a1.2 + a1.3 + a1.4)
        <br />
        {' '}
      </div>
      <table
        style={{
          ...tableBase,
          fontSize: '7pt',
          tableLayout: 'fixed',
          marginBottom: '3mm',
        }}
      >
        {ANEXO_COLGROUP}
        <thead>
          <tr>
            <ThSmall align="left">Columna</ThSmall>
            <ThSmall>Cant.</ThSmall>
            <ThSmall>Cto. unit.</ThSmall>
            <ThSmall highlight>Costo Total</ThSmall>
            {MESES_KEYS.map((m) => (
              <ThSmall key={m}>{MESES_LABELS[m]}</ThSmall>
            ))}
            <ThSmall highlight>Total año</ThSmall>
            <ThSmall>Año +1</ThSmall>
            <ThSmall>Año +2</ThSmall>
          </tr>
        </thead>
        <tbody>
          {/* Fila primaria — moneda de ingreso */}
          <tr>
            <TdS strong>{isUsd ? 'Total (USD)' : 'Total (M$)'}</TdS>
            <TdS /><TdS />
            <TdS num strong>{fmt(col.costoTotal)}</TdS>
            {MESES_KEYS.map((m) => (
              <TdS key={m} num strong>{fmt(col.meses[m])}</TdS>
            ))}
            <TdS num strong>{fmt(col.totalAnual)}</TdS>
            <TdS num strong>{fmt(col.anioMas1)}</TdS>
            <TdS num strong>{fmt(col.anioMas2)}</TdS>
          </tr>
          {/* Fila referencia — moneda opuesta */}
          <tr>
            <TdS strong highlight>{isUsd ? 'Ref. M$' : 'Total (USD)'}</TdS>
            <TdS highlight /><TdS highlight />
            <TdS num strong highlight>
              {isUsd ? formatMoneyRounded(col.costoTotal) : formatUsdFromMilesRounded(col.costoTotal, cotizacion)}
            </TdS>
            {MESES_KEYS.map((m) => (
              <TdS key={m} num strong highlight>
                {isUsd ? formatMoneyRounded(col.meses[m]) : formatUsdFromMilesRounded(col.meses[m], cotizacion)}
              </TdS>
            ))}
            <TdS num strong highlight>
              {isUsd ? formatMoneyRounded(col.totalAnual) : formatUsdFromMilesRounded(col.totalAnual, cotizacion)}
            </TdS>
            <TdS num strong highlight>
              {isUsd ? formatMoneyRounded(col.anioMas1) : formatUsdFromMilesRounded(col.anioMas1, cotizacion)}
            </TdS>
            <TdS num strong highlight>
              {isUsd ? formatMoneyRounded(col.anioMas2) : formatUsdFromMilesRounded(col.anioMas2, cotizacion)}
            </TdS>
          </tr>
        </tbody>
      </table>
    </>
  );
}

/**
 * Página contenedora para varios bloques de Anexos. Encabezado + nota m$ +
 * hijos apilados verticalmente.
 */
function AnexosGroupPage({
  proyecto,
  children,
  isUsd = false,
}: {
  proyecto: string | undefined;
  children: ReactNode;
  isUsd?: boolean;
}) {
  return (
    <>
      <PageHeadingRow tag="③" title={`Anexos — ${proyecto || '—'}`} />
      <Note>
        Importes en {isUsd ? 'USD (moneda de ingreso)' : 'Millones de Pesos (M$)'}. Se incluye fila de referencia en {isUsd ? 'M$' : 'USD'}.
      </Note>
      {children}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Primitivos de layout
// ═══════════════════════════════════════════════════════════════════════════

const DIMS: Record<Orientation, { w: string; h: string }> = {
  portrait: { w: '210mm', h: '297mm' },
  landscape: { w: '297mm', h: '210mm' },
};

function Page({
  n,
  total,
  orientation = 'portrait',
  children,
}: {
  n: number;
  total: number;
  orientation?: Orientation;
  children: ReactNode;
}) {
  const { w, h } = DIMS[orientation];
  return (
    <section
      data-pdf-page
      data-pdf-orientation={orientation}
      style={{
        width: w,
        height: h,
        padding: '12mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        // Flex column para que cualquier hijo con `flex: 1` (típicamente un
        // KVBlock con `fill`) se estire hasta el borde inferior de la página.
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header n={n} total={total} />
      <div
        style={{
          marginTop: '3mm',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Header({ n, total }: { n: number; total: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '4mm',
        borderBottom: '2px solid #1a3a5c',
        paddingBottom: '2mm',
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          background: CORREO_AMARILLO,
          padding: '1.5mm 2.5mm',
          borderRadius: '1px',
          lineHeight: 0,
        }}
      >
        <img
          src="/logo-correo-argentino.png"
          alt="Correo Argentino"
          style={{
            height: '10mm',
            width: 'auto',
            display: 'block',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: '8pt',
            color: '#6b6158',
            letterSpacing: '0.5px',
          }}
        >
          AD-OO-0136/01
        </div>
        <div
          style={{
            fontSize: '10.5pt',
            fontWeight: 600,
            color: '#1a3a5c',
            marginTop: '0.5mm',
          }}
        >
          Aprobación de Proyecto de Erogaciones Mayores
        </div>
      </div>
      <div style={{ fontSize: '8pt', color: '#6b6158', whiteSpace: 'nowrap' }}>
        Página {n} / {total}
      </div>
    </div>
  );
}

function PageHeadingRow({ tag, title }: { tag: string; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3mm',
        marginTop: '2mm',
        marginBottom: '1mm',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontSize: '14pt',
          fontWeight: 700,
          color: '#1a3a5c',
          lineHeight: 1,
        }}
      >
        {tag}
      </span>
      <span
        style={{
          fontSize: '10.5pt',
          fontWeight: 600,
          color: '#1c1814',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          lineHeight: 1,
        }}
      >
        {title}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  // Pedido del usuario: título alineado a la izquierda + línea en blanco abajo
  // dentro de la barra azul (en vez de intentar centrar verticalmente, que
  // html2canvas no respeta). El <br/> + nbsp crea la 2da línea.
  return (
    <h2
      style={{
        background: '#1a3a5c',
        borderRadius: '1px',
        marginTop: '4mm',
        marginBottom: '2.5mm',
        padding: '1.5mm 3mm',
        color: '#ffffff',
        fontSize: '9pt',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {children}
      <br />
      {' '}
    </h2>
  );
}

function Subheader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '8pt',
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#1a3a5c',
        marginTop: '3mm',
        marginBottom: '1.5mm',
        letterSpacing: '0.3px',
      }}
    >
      {children}
    </div>
  );
}

function Grid({
  cols,
  gap = '4mm',
  children,
}: {
  cols: string;
  gap?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap }}>
      {children}
    </div>
  );
}

function KV({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5mm',
        // `fill` hace que el bloque consuma todo el espacio vertical sobrante
        // del Page (que ya es flex column), para que un KVBlock interno con
        // `fill` pueda crecer hasta el borde de la hoja.
        ...(fill && { flex: 1, minHeight: 0 }),
      }}
    >
      {children}
    </div>
  );
}

function KVRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: ReactNode;
  bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '3mm', alignItems: 'baseline' }}>
      <span
        style={{
          flex: '0 0 45mm',
          fontSize: '8pt',
          fontWeight: 600,
          color: '#6b6158',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '9pt', fontWeight: bold ? 600 : 400, flex: 1 }}>
        {value}
      </span>
    </div>
  );
}

function KVBlock({
  label,
  children,
  fill = false,
}: {
  label: string;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid #c8c0b4',
        borderRadius: '2px',
        background: '#ffffff',
        overflow: 'hidden',
        // Cuando `fill` está activo, el recuadro se estira hasta consumir
        // todo el espacio vertical disponible del KV padre (que a su vez
        // está dentro de la hoja en flex column). Visualmente: la caja del
        // texto ocupa toda la hoja salvo lo que dejen otros elementos.
        ...(fill && {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      <div
        style={{
          background: '#1a3a5c',
          padding: '4mm 3mm',
          color: '#ffffff',
          fontSize: '8pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          lineHeight: 1.4,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '9pt',
          padding: '2.5mm 3mm',
          ...(fill && { flex: 1, minHeight: 0 }),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Paragraph({ text }: { text: string | undefined | null }) {
  const t = (text ?? '').trim();
  if (!t) {
    return (
      <span style={{ color: '#b0a898', fontStyle: 'italic' }}>(sin completar)</span>
    );
  }
  return <div style={{ whiteSpace: 'pre-wrap' }}>{t}</div>;
}

function AnexoFlag({
  on,
  files,
}: {
  on: boolean | undefined;
  files?: ArchivoMeta[];
}) {
  const hasFiles = files && files.length > 0;
  return (
    <div style={{ marginTop: '1.5mm', fontSize: '7.5pt', color: on ? '#1a3a5c' : '#6b6158', fontWeight: on ? 600 : 400 }}>
      {on ? '☒ Incluye anexo adjunto' : '☐ Sin anexo'}
      {hasFiles && (
        <div style={{ marginTop: '1mm', display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
          {files!.map((f) => (
            <div
              key={f.id}
              style={{
                fontSize: '7pt',
                fontWeight: 400,
                color: '#1a3a5c',
                paddingLeft: '3mm',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5mm',
              }}
            >
              <span style={{ color: '#4a7ab5' }}>📎</span>
              <span>{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #c8c0b4',
        borderRadius: '1px',
        padding: '2mm 2.5mm',
        background: '#faf8f5',
      }}
    >
      <div
        style={{
          fontSize: '7pt',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#6b6158',
          letterSpacing: '0.3px',
          marginBottom: '0.8mm',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '9pt', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #c8c0b4',
        borderRadius: '2px',
        padding: '3mm 3.5mm',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          fontSize: '8pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#1a3a5c',
          letterSpacing: '0.4px',
          borderBottom: '1px solid #e8e0d4',
          paddingBottom: '1.5mm',
          marginBottom: '2mm',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm' }}>
        {children}
      </div>
    </div>
  );
}

function MoneyLine({
  label,
  v,
  total = false,
  emphasize = false,
}: {
  label: string;
  v: number | null | undefined;
  total?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingTop: total ? '1.2mm' : 0,
        borderTop: total ? '1px solid #c8c0b4' : 'none',
        background: emphasize ? '#eaf0f6' : 'transparent',
        padding: emphasize ? '1.5mm 2mm' : undefined,
        borderRadius: emphasize ? '1px' : undefined,
        marginTop: emphasize ? '1mm' : undefined,
      }}
    >
      <span style={{ fontSize: emphasize ? '9pt' : '8.5pt', fontWeight: total || emphasize ? 700 : 400 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
          fontSize: emphasize ? '10pt' : '8.5pt',
          fontWeight: total || emphasize ? 700 : 500,
          color: '#1a3a5c',
          textAlign: 'right',
          minWidth: '30mm',
        }}
      >
        {formatMoneyRounded(v)}
      </span>
    </div>
  );
}

function MoneyLineUsd({
  label,
  v,
  cotizacion,
  emphasize = false,
}: {
  label: string;
  v: number | null | undefined;
  cotizacion: number | null | undefined;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        background: emphasize ? '#eaf0f6' : 'transparent',
        padding: emphasize ? '1.5mm 2mm' : undefined,
        borderRadius: emphasize ? '1px' : undefined,
      }}
    >
      <span
        style={{
          fontSize: emphasize ? '9pt' : '8.5pt',
          fontWeight: emphasize ? 700 : 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
          fontSize: emphasize ? '10pt' : '8.5pt',
          fontWeight: emphasize ? 700 : 600,
          color: '#1a3a5c',
          textAlign: 'right',
          minWidth: '30mm',
        }}
      >
        {formatUsdFromMilesRounded(v, cotizacion)}
      </span>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '7.5pt',
        fontStyle: 'italic',
        color: '#b0a898',
        padding: '1.5mm 0',
      }}
    >
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '7.5pt',
        color: '#6b6158',
        fontStyle: 'italic',
        marginBottom: '2mm',
      }}
    >
      {children}
    </div>
  );
}

// ─── Table primitives (Carátula) ────────────────────────────────────────────

const tableBase: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '8pt',
};

const tdTotalCaratula: CSSProperties = {
  background: '#e8e0d4',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: '7.5pt',
};

function Td({
  children,
  num = false,
  strong = false,
  style,
}: {
  children?: ReactNode;
  num?: boolean;
  strong?: boolean;
  style?: CSSProperties;
}) {
  return (
    <td
      style={{
        border: '1px solid #c8c0b4',
        padding: '1.2mm 2mm',
        fontSize: '8pt',
        fontFamily: num ? '"IBM Plex Mono", ui-monospace, monospace' : undefined,
        textAlign: num ? 'right' : 'left',
        fontWeight: strong ? 700 : 400,
        background: strong ? '#e8e0d4' : '#ffffff',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function Th({
  children,
  align = 'center',
  width,
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}) {
  return (
    <th
      style={{
        background: '#1a3a5c',
        color: '#ffffff',
        padding: '1.5mm 2mm',
        fontSize: '7.5pt',
        fontWeight: 600,
        textAlign: align,
        border: '1px solid #2a5080',
        width,
      }}
    >
      {children}
    </th>
  );
}

function ResumenRow({
  label,
  fila,
  total,
}: {
  label: string;
  fila:
    | { ejActual?: number; ejSiguientes?: number; previsto?: number }
    | undefined;
  total: number;
}) {
  return (
    <tr>
      <Td style={{ background: '#faf8f5', fontSize: '7.5pt', fontWeight: 500 }}>
        {label}
      </Td>
      <Td num>{formatMoneyRounded(fila?.ejActual)}</Td>
      <Td num>{formatMoneyRounded(fila?.ejSiguientes)}</Td>
      <Td num style={{ background: '#eaf0f6', color: '#1a3a5c', fontWeight: 600 }}>
        {formatMoneyRounded(total)}
      </Td>
      <Td num>{formatMoneyRounded(fila?.previsto)}</Td>
    </tr>
  );
}

// Header y fila espejo para la tabla de USD.
function ThUsd({
  children,
  align = 'center',
  width,
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}) {
  return (
    <th
      style={{
        background: '#0d2a45',
        color: '#ffffff',
        padding: '1.5mm 2mm',
        fontSize: '7.5pt',
        fontWeight: 600,
        textAlign: align,
        border: '1px solid #2a5080',
        width,
      }}
    >
      {children}
    </th>
  );
}

function ResumenRowUsd({
  label,
  fila,
  total,
  cotizacion,
}: {
  label: string;
  fila:
    | { ejActual?: number; ejSiguientes?: number; previsto?: number }
    | undefined;
  total: number;
  cotizacion: number | null | undefined;
}) {
  const usdStyle: CSSProperties = {
    background: '#eaf0f6',
    color: '#1a3a5c',
    fontWeight: 600,
  };
  return (
    <tr>
      <Td style={{ background: '#faf8f5', fontSize: '7.5pt', fontWeight: 500 }}>
        {label}
      </Td>
      <Td num style={usdStyle}>{formatUsdFromMilesRounded(fila?.ejActual, cotizacion)}</Td>
      <Td num style={usdStyle}>{formatUsdFromMilesRounded(fila?.ejSiguientes, cotizacion)}</Td>
      <Td num style={{ ...usdStyle, fontWeight: 700 }}>
        {formatUsdFromMilesRounded(total, cotizacion)}
      </Td>
      <Td num style={usdStyle}>{formatUsdFromMilesRounded(fila?.previsto, cotizacion)}</Td>
    </tr>
  );
}

// ─── Table primitives (Detalle + Anexos) ────────────────────────────────────

function ThSmall({
  children,
  align = 'center',
  highlight = false,
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  highlight?: boolean;
}) {
  return (
    <th
      style={{
        background: highlight ? '#0d2a45' : '#1a3a5c',
        color: '#ffffff',
        padding: '1.2mm 1mm',
        fontSize: '6.5pt',
        fontWeight: 600,
        textAlign: align,
        textTransform: 'uppercase',
        letterSpacing: '0.2px',
        border: '0.5px solid #2a5080',
      }}
    >
      {children}
    </th>
  );
}

function TdS({
  children,
  num = false,
  strong = false,
  highlight = false,
}: {
  children?: ReactNode;
  num?: boolean;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <td
      style={{
        border: '0.5px solid #c8c0b4',
        padding: '0.8mm 1mm',
        fontSize: '6.5pt',
        fontFamily: num ? '"IBM Plex Mono", ui-monospace, monospace' : undefined,
        textAlign: num ? 'right' : 'left',
        fontWeight: strong ? 700 : 400,
        background: strong
          ? '#e8e0d4'
          : highlight
            ? 'rgba(26,58,92,0.08)'
            : '#ffffff',
        color: highlight ? '#1a3a5c' : '#1c1814',
        // Si el número (o el concepto) no entra a lo ancho, parte el contenido
        // y crece la fila en alto en vez de cortar visualmente el valor.
        wordBreak: num ? 'break-all' : 'break-word',
        overflowWrap: 'anywhere',
        whiteSpace: 'normal',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}

function SectionBandRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={DETALLE_COLSPAN}
        style={{
          background: '#1a3a5c',
          color: '#ffffff',
          padding: '1.2mm 2mm',
          fontSize: '7pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

function SubBandRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={DETALLE_COLSPAN}
        style={{
          background: '#eae6e0',
          color: '#1a3a5c',
          borderLeft: '3px solid #1a3a5c',
          padding: '1mm 2mm',
          fontSize: '6.5pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

function GroupBandRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={DETALLE_COLSPAN}
        style={{
          background: '#ffffff',
          color: '#6b6158',
          padding: '0.8mm 2mm 0.8mm 5mm',
          fontSize: '6.5pt',
          fontStyle: 'italic',
          borderBottom: '0.5px solid #e8e0d4',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

function DataBandRow({
  number,
  label,
  meses,
  total,
}: {
  number?: string;
  label: string;
  meses:
    | Partial<Record<(typeof MESES_KEYS)[number], number | undefined>>
    | undefined;
  total: number;
}) {
  const fmt = useContext(PdfFmtCtx);
  return (
    <tr>
      <td
        style={{
          border: '0.5px solid #c8c0b4',
          padding: '0.6mm 1.5mm',
          fontSize: '6.5pt',
          display: 'flex',
          gap: '2mm',
          alignItems: 'baseline',
        }}
      >
        {number && (
          <span
            style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              color: '#6b6158',
              minWidth: '7mm',
            }}
          >
            {number}
          </span>
        )}
        <span>{label}</span>
      </td>
      {MESES_KEYS.map((m) => (
        <TdS key={m} num>
          {fmt(meses?.[m] ?? 0)}
        </TdS>
      ))}
      <TdS num highlight>
        {fmt(total)}
      </TdS>
    </tr>
  );
}

function TotalBandRow({
  label,
  per,
  strong = false,
}: {
  label: string;
  per: PerColumn;
  strong?: boolean;
}) {
  const fmt = useContext(PdfFmtCtx);
  const bg = strong ? '#1a3a5c' : '#e8e0d4';
  const color = strong ? '#ffffff' : '#1a3a5c';
  return (
    <tr>
      <td
        style={{
          background: bg,
          color,
          padding: '0.8mm 2mm',
          fontSize: '6.5pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          border: '0.5px solid #6b6158',
        }}
      >
        {label}
      </td>
      {MESES_KEYS.map((m) => (
        <td
          key={m}
          style={{
            border: '0.5px solid #6b6158',
            background: bg,
            color,
            padding: '0.8mm 1mm',
            fontSize: '6.5pt',
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            textAlign: 'right',
            fontWeight: 700,
          }}
        >
          {fmt(per.meses[m])}
        </td>
      ))}
      <td
        style={{
          border: '0.5px solid #6b6158',
          background: bg,
          color,
          padding: '0.8mm 1.5mm',
          fontSize: '7pt',
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
          textAlign: 'right',
          fontWeight: 700,
        }}
      >
        {fmt(per.anual)}
      </td>
    </tr>
  );
}

function MirrorBandRow({
  label,
  per,
}: {
  label: string;
  per: PerColumn;
}) {
  const fmt = useContext(PdfFmtCtx);
  const bg = 'rgba(26,58,92,0.08)';
  return (
    <tr>
      <td
        style={{
          background: bg,
          color: '#1a3a5c',
          padding: '0.8mm 2mm',
          fontSize: '6.5pt',
          fontWeight: 600,
          border: '0.5px solid #c8c0b4',
        }}
      >
        {label}
      </td>
      {MESES_KEYS.map((m) => (
        <td
          key={m}
          style={{
            border: '0.5px solid #c8c0b4',
            background: bg,
            color: '#1a3a5c',
            padding: '0.8mm 1mm',
            fontSize: '6.5pt',
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            textAlign: 'right',
            fontWeight: 600,
          }}
        >
          {fmt(per.meses[m])}
        </td>
      ))}
      <td
        style={{
          border: '0.5px solid #c8c0b4',
          background: bg,
          color: '#1a3a5c',
          padding: '0.8mm 1.5mm',
          fontSize: '7pt',
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
          textAlign: 'right',
          fontWeight: 700,
        }}
      >
        {fmt(per.anual)}
      </td>
    </tr>
  );
}

// Also handle AnexosTotales type (imported for completeness above).
export type { AnexosTotales };
