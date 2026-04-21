import { forwardRef, useMemo, type ReactNode, type CSSProperties } from 'react';
import {
  AUTORIZACIONES,
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
  type FilaAnexo,
  type Proyecto,
} from '../schemas/proyecto';
import {
  formatDateAR,
  formatMoneyZero,
  formatMonth,
  formatPercent,
} from '../utils/formatters';

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

  const pages = useMemo<PageDef[]>(() => {
    const list: PageDef[] = [];

    // ─── Carátula (3 páginas portrait) ────────────────────────────────────
    list.push({
      key: 'caratula-1',
      orientation: 'portrait',
      content: <CaratulaPage1 values={values} totales={totalesCaratula} />,
    });
    list.push({
      key: 'caratula-2',
      orientation: 'portrait',
      content: <CaratulaPage2 values={values} totales={totalesCaratula} />,
    });
    list.push({
      key: 'caratula-3',
      orientation: 'portrait',
      content: <CaratulaPage3 values={values} />,
    });

    // ─── Detalle Mensual (1 página landscape, siempre) ────────────────────
    list.push({
      key: 'detalle',
      orientation: 'landscape',
      content: <DetalleMensualPage values={values} totales={totalesDetalle} />,
    });

    // ─── Anexos Activos (N landscape; sólo sub-secciones con filas) ───────
    const anxOrder: Array<{ key: AnexoSectionKey; title: string }> = [
      { key: 'hardware', title: 'a1.1 — Detalle de Hardware' },
      { key: 'software', title: 'a1.2 — Detalle de Software / Licencias' },
      { key: 'desarrollosExternos', title: 'a1.3 — Desarrollos Externos' },
      { key: 'otrosTecnologicos', title: 'a1.4 — Otros Egresos Tecnológicos' },
      { key: 'bienesUso', title: 'a2 — Egresos en Bienes de Uso (no tecnológicos)' },
      { key: 'obras', title: 'a3 — Egresos en Obras en Edificios Propios' },
    ];

    for (const { key, title } of anxOrder) {
      const filas = values.anexosActivos?.[key]?.filas ?? [];
      if (filas.length === 0) continue;
      list.push({
        key: `anexos-${key}`,
        orientation: 'landscape',
        content: (
          <AnexoSubsectionPage
            title={title}
            proyecto={values.anexosActivos?.proyecto}
            filas={filas}
            rowTotals={totalesAnexos.sections[key].rowTotals}
            colTotals={totalesAnexos.sections[key].colTotals}
          />
        ),
      });
    }

    const techKeys: AnexoSectionKey[] = [
      'hardware',
      'software',
      'desarrollosExternos',
      'otrosTecnologicos',
    ];
    const hasAnyTech = techKeys.some(
      (k) => (values.anexosActivos?.[k]?.filas ?? []).length > 0
    );
    if (hasAnyTech) {
      list.push({
        key: 'anexos-tecnologicos',
        orientation: 'landscape',
        content: (
          <AnexosTecnologicosPage
            proyecto={values.anexosActivos?.proyecto}
            col={totalesAnexos.totalTecnologicos}
          />
        ),
      });
    }

    return list;
  }, [values, totalesCaratula, totalesDetalle, totalesAnexos]);

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

function CaratulaPage1({
  values,
  totales,
}: {
  values: Proyecto;
  totales: ReturnType<typeof computeTotales>;
}) {
  const c = values.caratula;
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Encabezado</SectionTitle>
      <KV>
        <KVRow label="Fecha" value={formatDateAR(c?.encabezado?.fecha)} />
        <KVRow label="Dirección" value={c?.encabezado?.direccion || '—'} />
        <KVRow label="Gerencia" value={c?.encabezado?.gerencia || '—'} />
        <KVRow label="OT" value={c?.encabezado?.ot || '—'} />
      </KV>

      <SectionTitle>A. Descripción General</SectionTitle>
      <KV>
        <KVRow
          label="Denominación del proyecto"
          value={c?.descripcion?.denominacion || '—'}
          bold
        />
        <KVBlock label="Descripción">
          <Paragraph text={c?.descripcion?.descripcion} />
          <AnexoFlag on={c?.descripcion?.descripcionIncluyeAnexo} />
        </KVBlock>
        <KVBlock label="Objetivos y justificación">
          <Paragraph text={c?.descripcion?.objetivos} />
          <AnexoFlag on={c?.descripcion?.objetivosIncluyeAnexo} />
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

      <SectionTitle>Características Básicas</SectionTitle>
      <Grid cols="repeat(3, 1fr)">
        <MiniField
          label="Mes de inicio del proyecto"
          value={formatMonth(c?.caracteristicas?.mesInicio) || '—'}
        />
        <MiniField
          label="Mes de finalización de la erogación"
          value={formatMonth(c?.caracteristicas?.mesFinErogacion) || '—'}
        />
        <MiniField
          label="Mes de finalización del proyecto"
          value={formatMonth(c?.caracteristicas?.mesFinProyecto) || '—'}
        />
      </Grid>

      <SectionTitle>Resumen de Montos Involucrados</SectionTitle>
      <Note>Importes en miles de pesos (m$).</Note>
      <table style={tableBase}>
        <thead>
          <tr>
            <Th align="left" width="38%">
              Concepto
            </Th>
            <Th>Ejercicio actual</Th>
            <Th>Siguientes</Th>
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
              {formatMoneyZero(totales.resumen.montoTotalEjActual)}
            </Td>
            <Td num strong>
              {formatMoneyZero(totales.resumen.montoTotalEjSiguientes)}
            </Td>
            <Td num strong>
              {formatMoneyZero(totales.resumen.montoTotalTotal)}
            </Td>
            <Td num strong>
              {formatMoneyZero(totales.resumen.montoTotalPrevisto)}
            </Td>
          </tr>
          <ResumenRow
            label="Gastos incrementales corrientes"
            fila={c?.resumenMontos?.gastosIncrementales}
            total={totales.resumen.gastosIncrementalesTotal}
          />
        </tbody>
      </table>
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
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Detalle del Monto Total a Invertir (m$)</SectionTitle>
      <Grid cols="1fr 1fr">
        <Box title="Activable">
          <MoneyLine label="1. Hardware" v={c?.detalleInversion?.activable?.hardware} />
          <MoneyLine label="2. Software" v={c?.detalleInversion?.activable?.software} />
          <MoneyLine label="3. Otros" v={c?.detalleInversion?.activable?.otros} />
          <MoneyLine label="Total activable" v={totales.detalle.totalActivable} total />

          <Subheader>No activable</Subheader>
          {(c?.detalleInversion?.noActivable ?? []).length === 0 && (
            <EmptyNote>Sin conceptos cargados.</EmptyNote>
          )}
          {(c?.detalleInversion?.noActivable ?? []).map((it, i) => (
            <MoneyLine
              key={it.id ?? i}
              label={it.concepto?.trim() || `Concepto ${i + 1}`}
              v={it.monto}
            />
          ))}
          <MoneyLine
            label="Total no activable"
            v={totales.detalle.totalNoActivable}
            total
          />
          <MoneyLine
            label="Total costo de la inversión"
            v={totales.detalle.totalInversion}
            emphasize
          />
        </Box>

        <Box title="Gastos Incrementales Corrientes">
          {(c?.detalleInversion?.gastosIncrementales ?? []).length === 0 && (
            <EmptyNote>Sin conceptos cargados.</EmptyNote>
          )}
          {(c?.detalleInversion?.gastosIncrementales ?? []).map((it, i) => (
            <MoneyLine
              key={it.id ?? i}
              label={it.concepto?.trim() || `Concepto ${i + 1}`}
              v={it.monto}
            />
          ))}
          <MoneyLine
            label="Total gastos incrementales corrientes"
            v={totales.detalle.totalGastosIncrementales}
            total
          />
        </Box>
      </Grid>

      <SectionTitle>Información Complementaria sobre Proyectos Informáticos</SectionTitle>
      <Grid cols="1fr 1fr">
        <Box title="Costos de Hardware">
          <MoneyLine label="1. Costo de equipos informáticos" v={c?.infoTI?.hardware?.equipos} />
          <MoneyLine label="2. Costos de instalación" v={c?.infoTI?.hardware?.instalacion} />
          <MoneyLine label="3. Otros costos" v={c?.infoTI?.hardware?.otros} />
          <MoneyLine label="Total costos de Hardware" v={totales.ti.totalHardware} total />
        </Box>
        <Box title="Costos de Software">
          <MoneyLine label="1. Licencias" v={c?.infoTI?.software?.licencias} />
          <MoneyLine label="2. Apoyo externo" v={c?.infoTI?.software?.apoyoExterno} />
          <MoneyLine label="3. Otros costos" v={c?.infoTI?.software?.otros} />
          <MoneyLine label="Total costos de Software" v={totales.ti.totalSoftware} total />
          <MoneyLine label="Total Hardware + Software" v={totales.ti.totalHwSw} emphasize />
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
          label="Valor Actual Neto (VAN, m$)"
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

function CaratulaPage3({ values }: { values: Proyecto }) {
  const c = values.caratula;
  return (
    <>
      <PageHeadingRow tag="①" title="Carátula" />
      <SectionTitle>Opiniones y Comentarios</SectionTitle>
      <KV>
        <KVBlock label="Planeamiento Estratégico y Control de Gestión">
          <Paragraph text={c?.opiniones?.planeamiento} />
        </KVBlock>
        <KVBlock label="Administración y Finanzas">
          <Paragraph text={c?.opiniones?.administracion} />
        </KVBlock>
        <KVBlock label="Áreas de Apoyo">
          <Paragraph text={c?.opiniones?.areasApoyo} />
        </KVBlock>
      </KV>

      <SectionTitle>C. Autorizaciones</SectionTitle>
      <div style={{ fontSize: '8pt', color: '#6b6158', fontStyle: 'italic', marginBottom: '3mm' }}>
        Las firmas se completan en papel tras imprimir el formulario.
      </div>
      <Grid cols="repeat(3, 1fr)" gap="5mm">
        {AUTORIZACIONES.map((a) => (
          <div
            key={a.key}
            style={{
              border: '1px solid #c8c0b4',
              borderRadius: '2px',
              padding: '3mm',
              background: '#ffffff',
              minHeight: '38mm',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontSize: '7pt',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#1a3a5c',
                letterSpacing: '0.4px',
                borderBottom: '1px solid #c8c0b4',
                paddingBottom: '2mm',
                marginBottom: '3mm',
                minHeight: '8mm',
              }}
            >
              {a.label}
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                borderBottom: '1px solid #6b6158',
                height: '14mm',
                marginBottom: '2mm',
              }}
            />
            <div
              style={{
                fontSize: '8pt',
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
        ))}
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

function DetalleMensualPage({
  values,
  totales,
}: {
  values: Proyecto;
  totales: DetalleTotales;
}) {
  const dm = values.detalleMensual;
  const inv = dm?.inversion;
  return (
    <>
      <PageHeadingRow tag="②" title={`Detalle Mensual — ${dm?.proyecto || '—'}`} />
      <Note>Importes en miles de pesos (m$).</Note>
      <table style={{ ...tableBase, fontSize: '6.5pt', tableLayout: 'fixed' }}>
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
        <tbody>
          <SectionBandRow label="a) Detalle de la Inversión" />
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
            label="TOTAL DE LA INVERSIÓN (a.1 + a.2)"
            per={totales.totalInversion}
            strong
          />

          <SectionBandRow label="b) Impacto Económico de la Inversión" />
          <SubBandRow label="b.1) Ingresos Incrementales (Venta)" />
          <DataBandRow
            label={labelOr(dm?.impacto?.ingresosIncrementales?.label, 'Detallar')}
            meses={dm?.impacto?.ingresosIncrementales?.meses}
            total={totales.rowTotals.ingresosIncrementales}
          />

          <SubBandRow label="b.2) Ahorro en Gastos Corrientes" />
          <DataBandRow
            label={labelOr(dm?.impacto?.ahorroGastos?.label, 'Detallar')}
            meses={dm?.impacto?.ahorroGastos?.meses}
            total={totales.rowTotals.ahorroGastos}
          />

          <MirrorBandRow label="b.3) Inversión no activable (= a.2)" per={totales.b3} />

          <SubBandRow label="b.4) Gastos Corrientes que ocasionará el proyecto" />
          <DataBandRow
            label={labelOr(dm?.impacto?.gastosCorrientes?.label, 'Detallar')}
            meses={dm?.impacto?.gastosCorrientes?.meses}
            total={totales.rowTotals.gastosCorrientes}
          />

          <DataBandRow
            number="b.5"
            label="Amortización de la inversión activable"
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
    </>
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

function AnexoSubsectionPage({
  title,
  proyecto,
  filas,
  rowTotals,
  colTotals,
}: {
  title: string;
  proyecto: string | undefined;
  filas: FilaAnexo[];
  rowTotals: Record<string, { costoTotal: number; totalAnual: number }>;
  colTotals: AnexoColTotals;
}) {
  return (
    <>
      <PageHeadingRow tag="③" title={`Anexos — ${proyecto || '—'}`} />
      <div
        style={{
          background: '#eae6e0',
          borderLeft: '4px solid #1a3a5c',
          padding: '1.5mm 3mm',
          fontSize: '8.5pt',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#1a3a5c',
          marginBottom: '2mm',
          letterSpacing: '0.3px',
        }}
      >
        {title}
      </div>
      <Note>Importes en miles de pesos (m$).</Note>
      <table style={{ ...tableBase, fontSize: '6.5pt', tableLayout: 'fixed' }}>
        {ANEXO_COLGROUP}
        <thead>
          <tr>
            <ThSmall align="left">Concepto</ThSmall>
            <ThSmall>Cant.</ThSmall>
            <ThSmall>Cto. unit. (m$)</ThSmall>
            <ThSmall highlight>Costo Total (m$)</ThSmall>
            {MESES_KEYS.map((m) => (
              <ThSmall key={m}>{MESES_LABELS[m]}</ThSmall>
            ))}
            <ThSmall highlight>Total año</ThSmall>
            <ThSmall>Año +1</ThSmall>
            <ThSmall>Año +2</ThSmall>
          </tr>
        </thead>
        <tbody>
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
                <TdS num>{formatMoneyZero(f.costoUnitario)}</TdS>
                <TdS num highlight>
                  {formatMoneyZero(rt.costoTotal)}
                </TdS>
                {MESES_KEYS.map((m) => (
                  <TdS key={m} num>
                    {formatMoneyZero(f.meses?.[m])}
                  </TdS>
                ))}
                <TdS num highlight>
                  {formatMoneyZero(rt.totalAnual)}
                </TdS>
                <TdS num>{formatMoneyZero(f.anioMas1)}</TdS>
                <TdS num>{formatMoneyZero(f.anioMas2)}</TdS>
              </tr>
            );
          })}
          {/* Fila total */}
          <tr>
            <TdS strong>Total</TdS>
            <TdS strong />
            <TdS strong />
            <TdS num strong>
              {formatMoneyZero(colTotals.costoTotal)}
            </TdS>
            {MESES_KEYS.map((m) => (
              <TdS key={m} num strong>
                {formatMoneyZero(colTotals.meses[m])}
              </TdS>
            ))}
            <TdS num strong>
              {formatMoneyZero(colTotals.totalAnual)}
            </TdS>
            <TdS num strong>
              {formatMoneyZero(colTotals.anioMas1)}
            </TdS>
            <TdS num strong>
              {formatMoneyZero(colTotals.anioMas2)}
            </TdS>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function AnexosTecnologicosPage({
  proyecto,
  col,
}: {
  proyecto: string | undefined;
  col: AnexoColTotals;
}) {
  return (
    <>
      <PageHeadingRow tag="③" title={`Anexos — ${proyecto || '—'}`} />
      <div
        style={{
          background: '#1a3a5c',
          color: '#ffffff',
          padding: '2mm 3mm',
          fontSize: '9pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          marginBottom: '3mm',
        }}
      >
        TOTAL ACTIVOS TECNOLÓGICOS (a1.1 + a1.2 + a1.3 + a1.4)
      </div>
      <Note>Importes en miles de pesos (m$).</Note>
      <table style={{ ...tableBase, fontSize: '7pt', tableLayout: 'fixed' }}>
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
          <tr>
            <TdS strong>Total</TdS>
            <TdS />
            <TdS />
            <TdS num strong>{formatMoneyZero(col.costoTotal)}</TdS>
            {MESES_KEYS.map((m) => (
              <TdS key={m} num strong>
                {formatMoneyZero(col.meses[m])}
              </TdS>
            ))}
            <TdS num strong>{formatMoneyZero(col.totalAnual)}</TdS>
            <TdS num strong>{formatMoneyZero(col.anioMas1)}</TdS>
            <TdS num strong>{formatMoneyZero(col.anioMas2)}</TdS>
          </tr>
        </tbody>
      </table>
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
      }}
    >
      <Header n={n} total={total} />
      <div style={{ marginTop: '3mm' }}>{children}</div>
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
        borderBottom: '2px solid #1a3a5c',
        paddingBottom: '2mm',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: '8pt',
            color: '#6b6158',
            letterSpacing: '0.5px',
          }}
        >
          AD-OO-0136/01-05 · Ene. 22
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
        alignItems: 'baseline',
        gap: '3mm',
        marginTop: '2mm',
        marginBottom: '1mm',
      }}
    >
      <span style={{ fontSize: '14pt', fontWeight: 700, color: '#1a3a5c' }}>
        {tag}
      </span>
      <span
        style={{
          fontSize: '10.5pt',
          fontWeight: 600,
          color: '#1c1814',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {title}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        background: '#1a3a5c',
        color: '#ffffff',
        padding: '1.5mm 3mm',
        fontSize: '9pt',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginTop: '4mm',
        marginBottom: '2.5mm',
        borderRadius: '1px',
      }}
    >
      {children}
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

function KV({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
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

function KVBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: '8pt',
          fontWeight: 600,
          color: '#6b6158',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          marginBottom: '1mm',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '9pt',
          borderLeft: '2px solid #c8c0b4',
          paddingLeft: '3mm',
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

function AnexoFlag({ on }: { on: boolean | undefined }) {
  return (
    <div
      style={{
        marginTop: '1.5mm',
        fontSize: '7.5pt',
        color: on ? '#1a3a5c' : '#6b6158',
        fontWeight: on ? 600 : 400,
      }}
    >
      {on ? '☒ Incluye anexo adjunto' : '☐ Sin anexo'}
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
        {formatMoneyZero(v)}
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

function ResumenRow({
  label,
  fila,
  total,
}: {
  label: string;
  fila: { ejActual?: number; ejSiguientes?: number; previsto?: number } | undefined;
  total: number;
}) {
  return (
    <tr>
      <Td style={{ background: '#faf8f5', fontSize: '7.5pt', fontWeight: 500 }}>
        {label}
      </Td>
      <Td num>{formatMoneyZero(fila?.ejActual)}</Td>
      <Td num>{formatMoneyZero(fila?.ejSiguientes)}</Td>
      <Td num style={{ background: '#eaf0f6', color: '#1a3a5c', fontWeight: 600 }}>
        {formatMoneyZero(total)}
      </Td>
      <Td num>{formatMoneyZero(fila?.previsto)}</Td>
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
          {formatMoneyZero(meses?.[m])}
        </TdS>
      ))}
      <TdS num highlight>
        {formatMoneyZero(total)}
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
          {formatMoneyZero(per.meses[m])}
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
        {formatMoneyZero(per.anual)}
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
          {formatMoneyZero(per.meses[m])}
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
        {formatMoneyZero(per.anual)}
      </td>
    </tr>
  );
}

// Also handle AnexosTotales type (imported for completeness above).
export type { AnexosTotales };
