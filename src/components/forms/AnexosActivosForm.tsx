import { useEffect, useRef, type ReactNode } from 'react';
import {
  useFieldArray,
  useFormContext,
  type FieldPath,
} from 'react-hook-form';
import {
  useAnexosTotales,
  type AnexoColTotals,
  type AnexoSectionKey,
  type AnexoSectionTotals,
} from '../../hooks/useCalculatedTotals';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import {
  MESES_KEYS,
  MESES_LABELS,
  nuevaFilaAnexo,
  type Proyecto,
} from '../../schemas/proyecto';
import { AUTORIZACIONES } from '../../data/constants';
import { formatMoneyZero } from '../../utils/formatters';
import { Input, MoneyInput, SectionTitle, SignatureBox } from '../ui';

/** Total columnas: 1 concepto + 1 cant + 1 ctoUnit + 1 costoTotal + 12 meses + 1 totalAnual + 2 año extra + 1 acciones = 20 */
const COLSPAN = 20;

export function AnexosActivosForm() {
  const { register, getValues, setValue } = useFormContext<Proyecto>();
  const totales = useAnexosTotales();

  // Pre-cargar Proyecto desde Carátula solo al montar y si está vacío.
  useEffect(() => {
    const current = getValues('anexosActivos.proyecto');
    const denom = getValues('caratula.descripcion.denominacion');
    if (!current && denom) {
      setValue('anexosActivos.proyecto', denom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[300px] flex-1">
          <label className="mb-1 block text-[13px] font-semibold text-ink">
            Proyecto
          </label>
          <Input
            {...register('anexosActivos.proyecto')}
            placeholder="Denominación del proyecto"
          />
        </div>
        <div className="pb-2 text-[11px] italic text-ink-muted">
          Importes en miles de pesos (m$)
        </div>
      </div>

      {/* a1 — Activos Tecnológicos */}
      <SectionTitle>a1 — Activos Tecnológicos</SectionTitle>

      <SubseccionTable
        title="a1.1 — Detalle de Hardware"
        sectionKey="hardware"
        totals={totales.sections.hardware}
      />
      <SubseccionTable
        title="a1.2 — Detalle de Software / Licencias"
        sectionKey="software"
        totals={totales.sections.software}
      />
      <SubseccionTable
        title="a1.3 — Desarrollos Externos"
        sectionKey="desarrollosExternos"
        totals={totales.sections.desarrollosExternos}
      />
      <SubseccionTable
        title="a1.4 — Otros Egresos Tecnológicos"
        sectionKey="otrosTecnologicos"
        totals={totales.sections.otrosTecnologicos}
      />

      <TotalAgregadoBox
        label="TOTAL ACTIVOS TECNOLÓGICOS (a1.1 + a1.2 + a1.3 + a1.4)"
        col={totales.totalTecnologicos}
      />

      {/* a2 */}
      <SectionTitle>a2 — Egresos en Bienes de Uso (no tecnológicos)</SectionTitle>
      <SubseccionTable
        title="a2 — Detalle de Bienes de Uso"
        sectionKey="bienesUso"
        totals={totales.sections.bienesUso}
      />

      {/* a3 */}
      <SectionTitle>a3 — Egresos en Obras en Edificios Propios</SectionTitle>
      <SubseccionTable
        title="a3 — Detalle de Obras (no mantenimiento)"
        sectionKey="obras"
        totals={totales.sections.obras}
      />

      {/* Autorizaciones al final — se imprimen como última página del PDF. */}
      <SectionTitle>C. Autorizaciones</SectionTitle>
      <div className="mb-3 text-[11px] italic text-ink-muted">
        Las firmas y fechas se completan a mano tras imprimir el formulario.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AUTORIZACIONES.map((a) => (
          <SignatureBox key={a.key} title={a.label} />
        ))}
      </div>
    </div>
  );
}

// ─── Subseccion genérica ────────────────────────────────────────────────────

function SubseccionTable({
  title,
  sectionKey,
  totals,
}: {
  title: string;
  sectionKey: AnexoSectionKey;
  totals: AnexoSectionTotals;
}) {
  const { register, control } = useFormContext<Proyecto>();
  const basePath = `anexosActivos.${sectionKey}.filas` as const;

  const { fields, append, remove } = useFieldArray({
    control,
    name: basePath,
    keyName: 'rhfId',
  });

  const tableRef = useRef<HTMLDivElement>(null);
  useGridNavigation(tableRef);

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="border-l-4 border-accent bg-section px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => append(nuevaFilaAnexo())}
          className="no-print rounded-sm border border-accent bg-accent px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-accent-dark"
        >
          + Agregar fila
        </button>
      </div>

      <div
        ref={tableRef}
        className="overflow-x-auto rounded-sm border border-border bg-white"
      >
        <table
          className="w-full border-collapse"
          style={{ tableLayout: 'fixed', minWidth: '1380px' }}
        >
          <colgroup>
            <col style={{ width: '180px' }} />
            <col style={{ width: '60px' }} />
            <col style={{ width: '85px' }} />
            <col style={{ width: '85px' }} />
            {MESES_KEYS.map((m) => (
              <col key={m} style={{ width: '58px' }} />
            ))}
            <col style={{ width: '80px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '36px' }} />
          </colgroup>
          <thead>
            <tr>
              <Th sticky align="left">
                Concepto
              </Th>
              <Th>Cant.</Th>
              <Th>Cto. unit. (m$)</Th>
              <Th highlight>Costo Total (m$)</Th>
              {MESES_KEYS.map((m) => (
                <Th key={m}>{MESES_LABELS[m]}</Th>
              ))}
              <Th highlight>Total año</Th>
              <Th>Año +1</Th>
              <Th>Año +2</Th>
              <Th aria-label="Acciones"> </Th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td
                  colSpan={COLSPAN}
                  className="py-4 text-center text-[11px] italic text-ink-muted"
                >
                  Sin filas cargadas — clickeá "+ Agregar fila" para comenzar.
                </td>
              </tr>
            )}

            {fields.map((f, i) => {
              const rt = totals.rowTotals[f.id];
              const costoTotal = rt?.costoTotal ?? 0;
              const totalAnual = rt?.totalAnual ?? 0;
              return (
                <tr key={f.rhfId} className="hover:bg-surface">
                  <td className="sticky left-0 z-10 border-b border-r-2 border-border bg-white p-0">
                    <input
                      {...register(
                        `${basePath}.${i}.concepto` as FieldPath<Proyecto>
                      )}
                      placeholder="Concepto"
                      data-grid-row={i}
                      data-grid-col={0}
                      className="h-[28px] w-full border-0 bg-transparent px-2 text-[11px] outline-none placeholder:italic placeholder:text-ink-muted/60 focus:bg-accent/5"
                    />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <input
                      type="number"
                      step="any"
                      {...register(
                        `${basePath}.${i}.cantidad` as FieldPath<Proyecto>,
                        {
                          setValueAs: (v) =>
                            v === '' || v === null || v === undefined
                              ? undefined
                              : Number(v),
                        }
                      )}
                      data-grid-row={i}
                      data-grid-col={1}
                      className="h-[28px] w-full border-0 bg-transparent px-1 text-right font-mono text-[10px] outline-none focus:bg-accent/5"
                    />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <MoneyInput
                      control={control}
                      name={
                        `${basePath}.${i}.costoUnitario` as FieldPath<Proyecto>
                      }
                      gridRow={i}
                      gridCol={2}
                      inputClassName="h-[28px] rounded-none border-0 px-1 py-0 text-[10px] focus:ring-0"
                    />
                  </td>
                  <td className="border-b border-r border-accent/20 bg-accent/5 px-1 py-1 text-right font-mono text-[10px] font-semibold text-accent">
                    {formatMoneyZero(costoTotal)}
                  </td>
                  {MESES_KEYS.map((m, mi) => (
                    <td
                      key={m}
                      className="border-b border-r border-border p-0"
                    >
                      <MoneyInput
                        control={control}
                        name={
                          `${basePath}.${i}.meses.${m}` as FieldPath<Proyecto>
                        }
                        gridRow={i}
                        gridCol={4 + mi}
                        inputClassName="h-[28px] rounded-none border-0 px-1 py-0 text-[10px] focus:ring-0"
                      />
                    </td>
                  ))}
                  <td className="border-b border-r border-accent/20 bg-accent/5 px-1 py-1 text-right font-mono text-[10px] font-semibold text-accent">
                    {formatMoneyZero(totalAnual)}
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <MoneyInput
                      control={control}
                      name={`${basePath}.${i}.anioMas1` as FieldPath<Proyecto>}
                      gridRow={i}
                      gridCol={17}
                      inputClassName="h-[28px] rounded-none border-0 px-1 py-0 text-[10px] focus:ring-0"
                    />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <MoneyInput
                      control={control}
                      name={`${basePath}.${i}.anioMas2` as FieldPath<Proyecto>}
                      gridRow={i}
                      gridCol={18}
                      inputClassName="h-[28px] rounded-none border-0 px-1 py-0 text-[10px] focus:ring-0"
                    />
                  </td>
                  <td className="border-b border-border p-0 text-center">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Eliminar fila ${i + 1}`}
                      className="no-print m-1 inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border text-ink-muted transition-colors hover:border-accent2 hover:text-accent2"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Total row */}
            {fields.length > 0 && <TotalRow col={totals.colTotals} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Row / cell helpers ─────────────────────────────────────────────────────

function Th({
  children,
  sticky = false,
  highlight = false,
  align = 'center',
  ...rest
}: {
  children: ReactNode;
  sticky?: boolean;
  highlight?: boolean;
  align?: 'left' | 'center' | 'right';
  'aria-label'?: string;
}) {
  return (
    <th
      {...rest}
      className={`border border-accent-light px-1.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-white ${
        highlight ? 'bg-accent-dark' : 'bg-accent'
      } ${sticky ? 'sticky left-0 z-20' : ''} ${
        align === 'left'
          ? 'text-left'
          : align === 'right'
            ? 'text-right'
            : 'text-center'
      }`}
    >
      {children}
    </th>
  );
}

function TotalRow({ col }: { col: AnexoColTotals }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 border-t-2 border-r-2 border-border-strong bg-total p-0">
        <div className="px-2 py-1.5 text-[11px] font-bold uppercase text-accent">
          Total
        </div>
      </td>
      <td className="border-t-2 border-border-strong bg-total" />
      <td className="border-t-2 border-border-strong bg-total" />
      <td className="border-t-2 border-r border-border-strong bg-total px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
        {formatMoneyZero(col.costoTotal)}
      </td>
      {MESES_KEYS.map((m) => (
        <td
          key={m}
          className="border-t-2 border-r border-border-strong bg-total px-1 py-1 text-right font-mono text-[10px] font-bold text-accent"
        >
          {formatMoneyZero(col.meses[m])}
        </td>
      ))}
      <td className="border-t-2 border-r border-border-strong bg-total px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
        {formatMoneyZero(col.totalAnual)}
      </td>
      <td className="border-t-2 border-r border-border-strong bg-total px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
        {formatMoneyZero(col.anioMas1)}
      </td>
      <td className="border-t-2 border-r border-border-strong bg-total px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
        {formatMoneyZero(col.anioMas2)}
      </td>
      <td className="border-t-2 border-border-strong bg-total" />
    </tr>
  );
}

// ─── Total agregado (TOTAL ACTIVOS TECNOLÓGICOS) ────────────────────────────

function TotalAgregadoBox({
  label,
  col,
}: {
  label: string;
  col: AnexoColTotals;
}) {
  return (
    <div className="mb-5 overflow-x-auto rounded-sm border-2 border-accent bg-accent/5">
      <div className="bg-accent px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
        {label}
      </div>
      <table
        className="w-full border-collapse"
        style={{ tableLayout: 'fixed', minWidth: '1380px' }}
      >
        <colgroup>
          <col style={{ width: '180px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '85px' }} />
          <col style={{ width: '85px' }} />
          {MESES_KEYS.map((m) => (
            <col key={m} style={{ width: '58px' }} />
          ))}
          <col style={{ width: '80px' }} />
          <col style={{ width: '72px' }} />
          <col style={{ width: '72px' }} />
          <col style={{ width: '36px' }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="border-r border-accent/30 bg-accent/10 px-2 py-1.5 text-[11px] font-bold uppercase text-accent">
              Total
            </td>
            <td className="bg-accent/10" />
            <td className="bg-accent/10" />
            <td className="border-r border-accent/30 bg-accent/10 px-1 py-1 text-right font-mono text-[11px] font-bold text-accent">
              {formatMoneyZero(col.costoTotal)}
            </td>
            {MESES_KEYS.map((m) => (
              <td
                key={m}
                className="border-r border-accent/30 bg-accent/10 px-1 py-1 text-right font-mono text-[10px] font-bold text-accent"
              >
                {formatMoneyZero(col.meses[m])}
              </td>
            ))}
            <td className="border-r border-accent/30 bg-accent/10 px-1 py-1 text-right font-mono text-[11px] font-bold text-accent">
              {formatMoneyZero(col.totalAnual)}
            </td>
            <td className="border-r border-accent/30 bg-accent/10 px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
              {formatMoneyZero(col.anioMas1)}
            </td>
            <td className="border-r border-accent/30 bg-accent/10 px-1 py-1 text-right font-mono text-[10px] font-bold text-accent">
              {formatMoneyZero(col.anioMas2)}
            </td>
            <td className="bg-accent/10" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
