import { forwardRef, useMemo, type ReactNode } from 'react';
import {
  AUTORIZACIONES,
  labelForModalidad,
  labelForTipoErogacion,
} from '../data/constants';
import { computeTotales } from '../hooks/useCalculatedTotals';
import type { Proyecto } from '../schemas/proyecto';
import {
  formatDateAR,
  formatMoneyZero,
  formatMonth,
  formatPercent,
} from '../utils/formatters';

type Props = {
  values: Proyecto;
};

/**
 * Renderizado read-only en formato A4 optimizado para html2canvas + jsPDF.
 * Cada <section data-pdf-page> se captura por separado como una página del PDF.
 *
 * Se usan estilos inline para las dimensiones críticas (mm de la hoja A4 y
 * bordes de tablas) para evitar que cambios de Tailwind rompan el layout.
 */
export const PdfPreview = forwardRef<HTMLDivElement, Props>(function PdfPreview(
  { values },
  ref
) {
  const totales = useMemo(
    () =>
      computeTotales({
        resumenMontos: values.caratula?.resumenMontos,
        detalleInversion: values.caratula?.detalleInversion,
        infoTI: values.caratula?.infoTI,
      }),
    [values.caratula]
  );

  const c = values.caratula;

  return (
    <div
      ref={ref}
      className="pdf-preview"
      style={{
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        color: '#1c1814',
        fontSize: '9pt',
        lineHeight: 1.4,
        background: '#ffffff',
      }}
    >
      <Page n={1} total={3}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
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
        </div>

        <SectionTitle>Resumen de Montos Involucrados</SectionTitle>
        <div
          style={{
            fontSize: '7.5pt',
            color: '#6b6158',
            marginBottom: '2mm',
            fontStyle: 'italic',
          }}
        >
          Importes en miles de pesos (m$).
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8pt',
          }}
        >
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
              <Td
                style={{
                  background: '#e8e0d4',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '7.5pt',
                }}
              >
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
      </Page>

      <Page n={2} total={3}>
        <SectionTitle>Detalle del Monto Total a Invertir (m$)</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
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
        </div>

        <SectionTitle>Información Complementaria sobre Proyectos Informáticos</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
          <Box title="Costos de Hardware">
            <MoneyLine
              label="1. Costo de equipos informáticos"
              v={c?.infoTI?.hardware?.equipos}
            />
            <MoneyLine
              label="2. Costos de instalación"
              v={c?.infoTI?.hardware?.instalacion}
            />
            <MoneyLine label="3. Otros costos" v={c?.infoTI?.hardware?.otros} />
            <MoneyLine
              label="Total costos de Hardware"
              v={totales.ti.totalHardware}
              total
            />
          </Box>
          <Box title="Costos de Software">
            <MoneyLine label="1. Licencias" v={c?.infoTI?.software?.licencias} />
            <MoneyLine
              label="2. Apoyo externo"
              v={c?.infoTI?.software?.apoyoExterno}
            />
            <MoneyLine label="3. Otros costos" v={c?.infoTI?.software?.otros} />
            <MoneyLine
              label="Total costos de Software"
              v={totales.ti.totalSoftware}
              total
            />
            <MoneyLine
              label="Total Hardware + Software"
              v={totales.ti.totalHwSw}
              emphasize
            />
          </Box>
        </div>

        <SectionTitle>B. Resultados de la Evaluación Económica</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3mm' }}>
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
        </div>
      </Page>

      <Page n={3} total={3}>
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
        <div
          style={{
            fontSize: '8pt',
            color: '#6b6158',
            fontStyle: 'italic',
            marginBottom: '3mm',
          }}
        >
          Las firmas se completan en papel tras imprimir el formulario.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '5mm',
          }}
        >
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
              <div style={{ fontSize: '8pt', color: '#6b6158' }}>
                Fecha:{' '}
                {formatDateAR(c?.autorizaciones?.[a.key]?.fecha) || '____________'}
              </div>
            </div>
          ))}
        </div>
      </Page>
    </div>
  );
});

// ─── Building blocks ────────────────────────────────────────────────────────

function Page({ n, total, children }: { n: number; total: number; children: ReactNode }) {
  return (
    <section
      data-pdf-page
      style={{
        width: '210mm',
        height: '297mm',
        padding: '15mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        overflow: 'hidden',
        pageBreakAfter: 'always',
      }}
    >
      <Header n={n} total={total} />
      <div style={{ marginTop: '4mm' }}>{children}</div>
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
        paddingBottom: '2.5mm',
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
            fontSize: '11pt',
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
        marginTop: '5mm',
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

function KV({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5mm',
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
}: {
  label: string;
  children: ReactNode;
}) {
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
      <span style={{ color: '#b0a898', fontStyle: 'italic' }}>
        (sin completar)
      </span>
    );
  }
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>{t}</div>
  );
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
      <span
        style={{
          fontSize: emphasize ? '9pt' : '8.5pt',
          fontWeight: total || emphasize ? 700 : 400,
        }}
      >
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
  children: ReactNode;
  num?: boolean;
  strong?: boolean;
  style?: React.CSSProperties;
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
