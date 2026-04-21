import { useEffect, type ReactNode } from 'react';
import { useFormContext, type FieldPath } from 'react-hook-form';
import {
  useDetalleTotales,
  type PerColumn,
} from '../../hooks/useCalculatedTotals';
import {
  MESES_KEYS,
  MESES_LABELS,
  type Proyecto,
} from '../../schemas/proyecto';
import { formatMoneyZero } from '../../utils/formatters';
import { Input, MoneyInput, SectionTitle } from '../ui';

export function DetalleMensualForm() {
  const { register, getValues, setValue } = useFormContext<Proyecto>();
  const totales = useDetalleTotales();

  // Pre-cargar "Proyecto" desde caratula.descripcion.denominacion solo una vez
  // al montar y solo si el campo está vacío — no queremos pisar ediciones
  // manuales posteriores si el usuario cambia la denominación en Carátula.
  useEffect(() => {
    const current = getValues('detalleMensual.proyecto');
    const denom = getValues('caratula.descripcion.denominacion');
    if (!current && denom) {
      setValue('detalleMensual.proyecto', denom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[300px] flex-1">
          <label className="mb-1 block text-[13px] font-semibold text-ink">
            Proyecto
          </label>
          <Input
            {...register('detalleMensual.proyecto')}
            placeholder="Denominación del proyecto"
          />
        </div>
        <div className="pb-2 text-[11px] italic text-ink-muted">
          Importes en miles de pesos (m$)
        </div>
      </div>

      <SectionTitle>Detalle Mensual por Concepto</SectionTitle>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
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
            />
            <DataRow
              number="1.2"
              label="Software"
              basePath="detalleMensual.inversion.tecnologia.software"
              rowTotal={totales.rowTotals.software}
            />
            <DataRow
              number="1.3"
              label="Licencias"
              basePath="detalleMensual.inversion.tecnologia.licencias"
              rowTotal={totales.rowTotals.licencias}
            />
            <DataRow
              number="1.4"
              label="Apoyo externo"
              basePath="detalleMensual.inversion.tecnologia.apoyoExterno"
              rowTotal={totales.rowTotals.apoyoExterno}
            />
            <DataRow
              number="1.5"
              label="Otros"
              basePath="detalleMensual.inversion.tecnologia.otros"
              rowTotal={totales.rowTotals.otros}
            />

            <GroupRow label="2. Egresos en bienes de uso varios" />
            <DataRow
              number="2.1"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.bienesUso.fila1"
              rowTotal={totales.rowTotals.bienesUso1}
            />
            <DataRow
              number="2.2"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.bienesUso.fila2"
              rowTotal={totales.rowTotals.bienesUso2}
            />

            <GroupRow label="3. Egresos en Obras (no mantenimiento)" />
            <DataRow
              number="3.1"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.obras.fila1"
              rowTotal={totales.rowTotals.obras1}
            />
            <DataRow
              number="3.2"
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.inversion.obras.fila2"
              rowTotal={totales.rowTotals.obras2}
            />

            <TotalRow label="Total a.1" per={totales.totalA1} />

            <SubSectionRow label="a.2) Egresos no activables" />
            <DataRow
              number="4"
              label="Capacitación externa"
              basePath="detalleMensual.noActivable.capacitacion"
              rowTotal={totales.rowTotals.capacitacion}
            />
            <DataRow
              number="5"
              label="Movilidades"
              basePath="detalleMensual.noActivable.movilidades"
              rowTotal={totales.rowTotals.movilidades}
            />
            <DataRow
              number="6"
              label="Refacciones y obras menores no activables"
              basePath="detalleMensual.noActivable.refacciones"
              rowTotal={totales.rowTotals.refacciones}
            />
            <DataRow
              number="7"
              labelEditable
              labelPlaceholder="Otros (detallar)"
              basePath="detalleMensual.noActivable.otros"
              rowTotal={totales.rowTotals.otrosNoActivable}
            />

            <TotalRow label="Total a.2" per={totales.totalA2} />
            <TotalRow
              label="TOTAL DE LA INVERSIÓN (a.1 + a.2)"
              per={totales.totalInversion}
              emphasis="strong"
            />

            {/* ═══ b) Impacto Económico ═══ */}
            <SectionRow label="b) Impacto Económico de la Inversión" />

            <SubSectionRow label="b.1) Ingresos Incrementales (Venta)" />
            <DataRow
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.impacto.ingresosIncrementales"
              rowTotal={totales.rowTotals.ingresosIncrementales}
            />

            <SubSectionRow label="b.2) Ahorro en Gastos Corrientes que ocasionará el proyecto" />
            <DataRow
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.impacto.ahorroGastos"
              rowTotal={totales.rowTotals.ahorroGastos}
            />

            <MirrorRow label="b.3) Inversión no activable (= a.2)" per={totales.b3} />

            <SubSectionRow label="b.4) Gastos Corrientes que ocasionará el proyecto" />
            <DataRow
              labelEditable
              labelPlaceholder="Detallar"
              basePath="detalleMensual.impacto.gastosCorrientes"
              rowTotal={totales.rowTotals.gastosCorrientes}
            />

            <DataRow
              number="b.5"
              label="Amortización de la inversión activable"
              basePath="detalleMensual.impacto.amortizacion"
              rowTotal={totales.rowTotals.amortizacion}
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
}: {
  number?: string;
  label?: string;
  labelEditable?: boolean;
  labelPlaceholder?: string;
  basePath: string;
  rowTotal: number;
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
              className="flex-1 bg-transparent text-[11px] outline-none placeholder:italic placeholder:text-ink-muted/60 focus:bg-accent/5"
            />
          ) : (
            <span className="flex-1 text-[11px]">{label}</span>
          )}
        </div>
      </td>
      {MESES_KEYS.map((m) => (
        <td key={m} className="border-b border-r border-border p-0">
          <MoneyInput
            control={control}
            name={`${basePath}.meses.${m}` as FieldPath<Proyecto>}
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
