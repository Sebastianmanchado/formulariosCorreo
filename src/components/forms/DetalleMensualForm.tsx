import { useRef, type ReactNode } from 'react';
import { useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import {
  useDetalleTotales,
  type PerColumn,
} from '../../hooks/useCalculatedTotals';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import {
  MESES_KEYS,
  MESES_LABELS,
  type Proyecto,
} from '../../schemas/proyecto';
import { formatMoneyZero } from '../../utils/formatters';
import { MoneyInput, SectionTitle } from '../ui';

export function DetalleMensualForm() {
  const { control } = useFormContext<Proyecto>();
  const totales = useDetalleTotales();
  const tableRef = useRef<HTMLDivElement>(null);
  useGridNavigation(tableRef);

  // Nombre del proyecto heredado de la Carátula — se muestra read-only.
  const denominacion = useWatch({
    control,
    name: 'caratula.descripcion.denominacion',
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[280px] flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Proyecto
          </div>
          <div className="text-[14px] font-semibold text-accent">
            {denominacion?.trim() || (
              <span className="font-normal italic text-ink-muted">
                Sin denominar — cargá el nombre en la Carátula.
              </span>
            )}
          </div>
        </div>
        <div className="pb-1 text-[11px] italic text-ink-muted">
          Importes en millones de pesos
        </div>
      </div>

      <SectionTitle>Detalle Mensual por Concepto</SectionTitle>

      <div
        ref={tableRef}
        className="overflow-x-auto rounded-sm border border-border bg-white"
      >
        <table
          className="w-full border-collapse"
          style={{ tableLayout: 'fixed', minWidth: '1180px' }}
        >
          <colgroup>
            <col style={{ width: '290px' }} />
            {MESES_KEYS.map((m) => (
              <col key={m} style={{ width: '68px' }} />
            ))}
            <col style={{ width: '86px' }} />
          </colgroup>
          <thead>
            <tr>
              <Th sticky>Concepto</Th>
              {MESES_KEYS.map((m) => (
                <Th key={m}>{MESES_LABELS[m]}</Th>
              ))}
              <Th highlight>Total año</Th>
            </tr>
          </thead>
          <tbody>
            {/* ═══ a) Detalle de la Inversión ═══ */}
            <SectionRow label="a) Detalle de la Inversión" />

            <SubSectionRow label="a.1) Egresos presumiblemente activables" />

            <GroupRow label="1. Egresos en Tecnología de Sistemas" />
            <DataRow
              number="1.1"
              label="Hardware"
              basePath="detalleMensual.inversion.tecnologia.hardware"
              rowTotal={totales.rowTotals.hardware}
              gridRow={0}
            />
            <DataRow
              number="1.2"
              label="Software"
              basePath="detalleMensual.inversion.tecnologia.software"
              rowTotal={totales.rowTotals.software}
              gridRow={1}
            />
            <DataRow
              number="1.3"
              label="Licencias"
              basePath="detalleMensual.inversion.tecnologia.licencias"
              rowTotal={totales.rowTotals.licencias}
              gridRow={2}
            />
            <DataRow
              number="1.4"
              label="Apoyo externo"
              basePath="detalleMensual.inversion.tecnologia.apoyoExterno"
              rowTotal={totales.rowTotals.apoyoExterno}
              gridRow={3}
            />
            <DataRow
              number="1.5"
              label="Otros"
              basePath="detalleMensual.inversion.tecnologia.otros"
              rowTotal={totales.rowTotals.otros}
              gridRow={4}
            />

            <GroupRow label="2. Egresos en bienes de uso varios" />
            <DataRow
              number="2.1"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.bienesUso.fila1"
              rowTotal={totales.rowTotals.bienesUso1}
              gridRow={5}
            />
            <DataRow
              number="2.2"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.bienesUso.fila2"
              rowTotal={totales.rowTotals.bienesUso2}
              gridRow={6}
            />

            <GroupRow label="3. Egresos en Obras (no mantenimiento)" />
            <DataRow
              number="3.1"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.obras.fila1"
              rowTotal={totales.rowTotals.obras1}
              gridRow={7}
            />
            <DataRow
              number="3.2"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.obras.fila2"
              rowTotal={totales.rowTotals.obras2}
              gridRow={8}
            />

            <TotalRow label="Total a.1" per={totales.totalA1} />

            <SubSectionRow label="a.2) Egresos no activables" />
            <DataRow
              number="4"
              label="Capacitación externa"
              basePath="detalleMensual.noActivable.capacitacion"
              rowTotal={totales.rowTotals.capacitacion}
              gridRow={9}
            />
            <DataRow
              number="5"
              label="Movilidades"
              basePath="detalleMensual.noActivable.movilidades"
              rowTotal={totales.rowTotals.movilidades}
              gridRow={10}
            />
            <DataRow
              number="6"
              label="Refacciones y obras menores no activables"
              basePath="detalleMensual.noActivable.refacciones"
              rowTotal={totales.rowTotals.refacciones}
              gridRow={11}
            />
            <DataRow
              number="7"
              labelEditable
              labelPlaceholder="Otros (detallar)"
              basePath="detalleMensual.noActivable.otros"
              rowTotal={totales.rowTotals.otrosNoActivable}
              gridRow={12}
            />

            <TotalRow label="Total a.2" per={totales.totalA2} />
            <TotalRow
              label="TOTAL DE LA INVERSIÓN (a.1 + a.2)"
              per={totales.totalInversion}
              emphasis="strong"
            />

            {/* Separador visual entre a) y b) */}
            <SpacerRow />

            {/* ═══ b) Impacto Económico ═══ */}
            <SectionRow label="b) Impacto Económico de la Inversión" />

            <DataRow
              number="b.1"
              label="Ingresos Incrementales (Venta)"
              basePath="detalleMensual.impacto.ingresosIncrementales"
              rowTotal={totales.rowTotals.ingresosIncrementales}
              gridRow={13}
            />
            <DataRow
              number="b.2"
              label="Ahorro en Gastos Corrientes que ocasionará el proyecto"
              basePath="detalleMensual.impacto.ahorroGastos"
              rowTotal={totales.rowTotals.ahorroGastos}
              gridRow={14}
            />
            <MirrorRow label="b.3) Inversión no activable (= a.2)" per={totales.b3} />
            <DataRow
              number="b.4"
              label="Gastos Corrientes que ocasionará el proyecto"
              basePath="detalleMensual.impacto.gastosCorrientes"
              rowTotal={totales.rowTotals.gastosCorrientes}
              gridRow={15}
            />
            <DataRow
              number="b.5"
              label="Amortización de la inversión activable"
              basePath="detalleMensual.impacto.amortizacion"
              rowTotal={totales.rowTotals.amortizacion}
              gridRow={16}
            />

            <TotalRow
              label="TOTAL IMPACTO EN RESULTADO (b.1 + b.2 − b.3 − b.4 − b.5)"
              per={totales.totalImpacto}
              emphasis="strong"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Building blocks ────────────────────────────────────────────────────────

function Th({
  children,
  sticky = false,
  highlight = false,
}: {
  children: ReactNode;
  sticky?: boolean;
  highlight?: boolean;
}) {
  return (
    <th
      className={`border border-accent-light px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-white ${
        highlight ? 'bg-accent-dark' : 'bg-accent'
      } ${sticky ? 'sticky left-0 z-20 text-left' : ''}`}
    >
      {children}
    </th>
  );
}

function SpacerRow() {
  return (
    <tr aria-hidden="true">
      <td
        colSpan={14}
        className="border-0 bg-bg p-0"
        style={{ height: '14px' }}
      />
    </tr>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={14}
        className="bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white"
      >
        {label}
      </td>
    </tr>
  );
}

function SubSectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={14}
        className="border-l-4 border-accent bg-section px-3 py-1.5 text-[11px] font-semibold uppercase text-accent"
      >
        {label}
      </td>
    </tr>
  );
}

function GroupRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={14}
        className="border-b border-border bg-white py-1 pl-6 pr-3 text-[11px] italic text-ink-muted"
      >
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  number,
  label,
  labelEditable = false,
  labelPlaceholder = 'Detallar',
  basePath,
  rowTotal,
  gridRow,
}: {
  number?: string;
  label?: string;
  labelEditable?: boolean;
  labelPlaceholder?: string;
  basePath: string;
  rowTotal: number;
  /** Índice de fila para useGridNavigation. */
  gridRow: number;
}) {
  const { register, control } = useFormContext<Proyecto>();
  return (
    <tr className="hover:bg-surface">
      <td className="sticky left-0 z-10 border-b border-r-2 border-border bg-white p-0">
        <div className="flex items-center gap-2 px-2 py-1">
          {number && (
            <span className="w-8 shrink-0 font-mono text-[10px] text-ink-muted">
              {number}
            </span>
          )}
          {labelEditable ? (
            <input
              {...register(`${basePath}.label` as FieldPath<Proyecto>)}
              placeholder={labelPlaceholder}
              data-grid-row={gridRow}
              data-grid-col={0}
              className="flex-1 bg-transparent text-[11px] outline-none placeholder:italic placeholder:text-ink-muted/60 focus:bg-accent/5"
            />
          ) : (
            <span className="flex-1 text-[11px]">{label}</span>
          )}
        </div>
      </td>
      {MESES_KEYS.map((m, i) => (
        <td key={m} className="border-b border-r border-border p-0">
          <MoneyInput
            control={control}
            name={`${basePath}.meses.${m}` as FieldPath<Proyecto>}
            gridRow={gridRow}
            gridCol={i + 1}
            inputClassName="h-[28px] rounded-none border-0 px-1 py-0 text-[10px] focus:ring-0"
          />
        </td>
      ))}
      <td className="border-b border-accent/10 bg-accent/5 px-2 py-1 text-right font-mono text-[10px] font-semibold text-accent">
        {formatMoneyZero(rowTotal)}
      </td>
    </tr>
  );
}

function TotalRow({
  label,
  per,
  emphasis = 'normal',
}: {
  label: string;
  per: PerColumn;
  emphasis?: 'normal' | 'strong';
}) {
  const isStrong = emphasis === 'strong';
  const bg = isStrong ? 'bg-accent text-white' : 'bg-total';
  const textColor = isStrong ? 'text-white' : 'text-accent';
  return (
    <tr>
      <td
        className={`sticky left-0 z-10 border-b border-r-2 border-border-strong ${bg} p-0`}
      >
        <div className="px-2 py-1.5">
          <span className={`text-[11px] font-bold uppercase ${textColor}`}>
            {label}
          </span>
        </div>
      </td>
      {MESES_KEYS.map((m) => (
        <td
          key={m}
          className={`border-b border-r border-border ${bg} px-1 py-1 text-right font-mono text-[10px] font-bold ${textColor}`}
        >
          {formatMoneyZero(per.meses[m])}
        </td>
      ))}
      <td
        className={`border-b ${bg} px-2 py-1 text-right font-mono text-[11px] font-bold ${textColor}`}
      >
        {formatMoneyZero(per.anual)}
      </td>
    </tr>
  );
}

function MirrorRow({ label, per }: { label: string; per: PerColumn }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 border-b border-r-2 border-border bg-accent/5 p-0">
        <div className="px-2 py-1.5">
          <span className="text-[11px] font-semibold text-accent">{label}</span>
        </div>
      </td>
      {MESES_KEYS.map((m) => (
        <td
          key={m}
          className="border-b border-r border-border bg-accent/5 px-1 py-1 text-right font-mono text-[10px] font-semibold text-accent"
        >
          {formatMoneyZero(per.meses[m])}
        </td>
      ))}
      <td className="border-b bg-accent/5 px-2 py-1 text-right font-mono text-[11px] font-semibold text-accent">
        {formatMoneyZero(per.anual)}
      </td>
    </tr>
  );
}
