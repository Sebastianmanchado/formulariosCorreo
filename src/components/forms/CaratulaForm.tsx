import { useFormContext, useWatch } from 'react-hook-form';
import { MODALIDADES_EVALUACION, TIPOS_EROGACION } from '../../data/constants';
import { DESCRIPCION_MAX, type Proyecto } from '../../schemas/proyecto';
import { useCalculatedTotals } from '../../hooks/useCalculatedTotals';
import { formatMoneyZero, formatUsdFromMiles, todayISO } from '../../utils/formatters';
import {
  CalculatedField,
  Card,
  Checkbox,
  DynamicList,
  Field,
  FileDropBox,
  Input,
  MoneyInput,
  MonedaToggle,
  MonthYearPicker,
  OrganigramaSelect,
  SectionTitle,
  Select,
  TextArea,
  TextAreaWithCount,
} from '../ui';

type CaratulaFormProps = {
  /** Handler para cambiar la moneda; el padre confirma y resetea todo. */
  onMonedaChange: (next: 'pesos' | 'usd') => void;
};

export function CaratulaForm({ onMonedaChange }: CaratulaFormProps) {
  return (
    <div className="space-y-2">
      <EncabezadoSection />
      <CotizacionSection onMonedaChange={onMonedaChange} />
      <DescripcionGeneralSection />
      <CaracteristicasSection />
      <ResumenMontosSection />
      <DetalleInversionSection />
      <InfoTISection />
      <EvaluacionEconomicaSection />
      <OpinionesSection />
      {/* Las autorizaciones se movieron al final de la solapa "Anexos Activos"
          para que queden como última página del PDF impreso. */}
    </div>
  );
}

// ─── Cotización USD (sólo en el form, el PDF la sigue mostrando dentro del Resumen) ──
function CotizacionSection({
  onMonedaChange,
}: {
  onMonedaChange: (next: 'pesos' | 'usd') => void;
}) {
  const { control } = useFormContext<Proyecto>();
  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="cotizacionUsd"
            className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
          >
            Cotización USD (pesos por dólar)
          </label>
          <div className="w-[220px]">
            <MoneyInput
              control={control}
              name="caratula.cotizacionUsd"
              placeholder="0,00"
              suffix="$/USD"
              id="cotizacionUsd"
              fixedCurrency="pesos"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Moneda de entrada:
          </span>
          <MonedaToggle onRequestModeChange={onMonedaChange} />
        </div>
      </div>
    </Card>
  );
}

// ─── Encabezado ─────────────────────────────────────────────────────────────
function EncabezadoSection() {
  const { register } = useFormContext<Proyecto>();
  const today = todayISO();
  return (
    <Card>
      <div className="grid gap-3 md:grid-cols-[180px_1fr_160px]">
        <Field label="Fecha" bold orientation="column">
          <Input type="date" max={today} {...register('caratula.encabezado.fecha')} />
        </Field>
        <div>
          <OrganigramaSelect />
        </div>
        <Field label="OT (Orden de Trabajo)" bold orientation="column">
          <Input type="text" {...register('caratula.encabezado.ot')} />
        </Field>
      </div>
    </Card>
  );
}

// ─── A. Descripción general ─────────────────────────────────────────────────
function DescripcionGeneralSection() {
  const { register, control } = useFormContext<Proyecto>();
  const descIncluyeAnexo = useWatch({
    control,
    name: 'caratula.descripcion.descripcionIncluyeAnexo',
  });
  const objIncluyeAnexo = useWatch({
    control,
    name: 'caratula.descripcion.objetivosIncluyeAnexo',
  });
  return (
    <>
      <SectionTitle>A. Descripción General</SectionTitle>
      <Card>
        <Field label="Denominación del proyecto" bold labelWidth="220px">
          <Input type="text" {...register('caratula.descripcion.denominacion')} />
        </Field>

        <hr className="my-3 border-border" />

        <Field label="Descripción" bold labelWidth="220px">
          <div className="mb-1.5 text-[11px] italic text-ink-muted">
            Añadir objetivos y comentarios de los adjuntos en caso de ser necesario.
          </div>
          <TextAreaWithCount<Proyecto>
            name="caratula.descripcion.descripcion"
            maxLength={DESCRIPCION_MAX}
            rows={3}
          />
          <div className="mt-1.5">
            <Checkbox
              label="La descripción incluye un anexo adjunto"
              {...register('caratula.descripcion.descripcionIncluyeAnexo')}
            />
          </div>
          {descIncluyeAnexo && (
            <FileDropBox<Proyecto> name="caratula.descripcion.descripcionAnexos" />
          )}
        </Field>

        <hr className="my-3 border-border" />

        <Field label="Objetivos y justificación" bold labelWidth="220px">
          <div className="mb-1.5 text-[11px] italic text-ink-muted">
            Añadir objetivos y justificación y comentarios de los adjuntos en caso de ser necesario.
          </div>
          <TextAreaWithCount<Proyecto>
            name="caratula.descripcion.objetivos"
            maxLength={DESCRIPCION_MAX}
            rows={3}
          />
          <div className="mt-1.5">
            <Checkbox
              label="Los objetivos incluyen un anexo adjunto"
              {...register('caratula.descripcion.objetivosIncluyeAnexo')}
            />
          </div>
          {objIncluyeAnexo && (
            <FileDropBox<Proyecto> name="caratula.descripcion.objetivosAnexos" />
          )}
        </Field>

        <hr className="my-3 border-border" />

        <Field label="Clasificación por tipo de erogación" bold labelWidth="220px">
          <Select {...register('caratula.descripcion.tipoErogacion')}>
            <option value="">— seleccionar —</option>
            {TIPOS_EROGACION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Clasificación por modalidad de evaluación" bold labelWidth="220px">
          <Select {...register('caratula.descripcion.modalidadEvaluacion')}>
            <option value="">— seleccionar —</option>
            {MODALIDADES_EVALUACION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
    </>
  );
}

// ─── Características básicas ────────────────────────────────────────────────
function CaracteristicasSection() {
  return (
    <>
      <SectionTitle variant="sub">Características Básicas</SectionTitle>
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Mes de inicio del proyecto" orientation="column">
            <MonthYearPicker<Proyecto> name="caratula.caracteristicas.mesInicio" />
          </Field>
          <Field label="Mes de finalización de la erogación" orientation="column">
            <MonthYearPicker<Proyecto>
              name="caratula.caracteristicas.mesFinErogacion"
            />
          </Field>
          <Field label="Mes de finalización del proyecto" orientation="column">
            <MonthYearPicker<Proyecto>
              name="caratula.caracteristicas.mesFinProyecto"
            />
          </Field>
        </div>
      </Card>
    </>
  );
}

// ─── Resumen de Montos ──────────────────────────────────────────────────────
function ResumenMontosSection() {
  const { control } = useFormContext<Proyecto>();
  const { resumen } = useCalculatedTotals();
  const resumenMontos = useWatch({ control, name: 'caratula.resumenMontos' });
  const cotizacion = useWatch({ control, name: 'caratula.cotizacionUsd' });
  const moneda = useWatch({ control, name: 'caratula.monedaEntrada' });
  const cotizacionValida =
    typeof cotizacion === 'number' && cotizacion > 0 && Number.isFinite(cotizacion);
  const pesosIsActive = !(moneda === 'usd' && cotizacionValida);

  const filas = [
    {
      label: 'Ingresos / Ahorros incrementales del proyecto',
      path: 'caratula.resumenMontos.ingresosAhorros',
      data: resumenMontos?.ingresosAhorros,
      total: resumen.ingresosAhorrosTotal,
    },
    {
      label: 'Egresos activables (hard, soft, bienes de uso) del proyecto',
      path: 'caratula.resumenMontos.egresosActivables',
      data: resumenMontos?.egresosActivables,
      total: resumen.egresosActivablesTotal,
    },
    {
      label: 'Otros egresos activables del proyecto',
      path: 'caratula.resumenMontos.otrosEgresosActivables',
      data: resumenMontos?.otrosEgresosActivables,
      total: resumen.otrosEgresosActivablesTotal,
    },
    {
      label: 'Gastos adic. no activables (capacitación, mantenimiento, etc.)',
      path: 'caratula.resumenMontos.gastosNoActivables',
      data: resumenMontos?.gastosNoActivables,
      total: resumen.gastosNoActivablesTotal,
    },
  ] as const;

  const usdCellClass =
    'border border-border bg-accent/5 px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-accent';
  const usdTotalCellClass =
    'border border-border bg-total px-2 py-1.5 text-right font-mono text-[11px] font-bold text-accent';
  const readOnlyPesosClass =
    'px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-ink-muted bg-section/50 cursor-not-allowed';
  const readOnlyUsdClass =
    'px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-accent bg-accent/5 cursor-not-allowed';

  /** Celda editable/read-only según el modo activo. */
  const pesosCell = (path: string, fld: 'ejActual' | 'ejSiguientes' | 'previsto', stored: number | undefined) => (
    <td className="border border-border p-0">
      {pesosIsActive ? (
        <MoneyInput
          control={control}
          name={`${path}.${fld}` as FieldPath<Proyecto>}
          fixedCurrency="pesos"
          inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
        />
      ) : (
        <div className={readOnlyPesosClass} title="Tabla autocalculada — cambiá la moneda para editar">
          {formatMoneyZero(stored)}
        </div>
      )}
    </td>
  );
  const usdCellEditable = (path: string, fld: 'ejActual' | 'ejSiguientes' | 'previsto', stored: number | undefined) => (
    <td className="border border-border p-0">
      {!pesosIsActive ? (
        <MoneyInput
          control={control}
          name={`${path}.${fld}` as FieldPath<Proyecto>}
          inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
        />
      ) : (
        <div className={readOnlyUsdClass} title="Tabla autocalculada — cambiá la moneda para editar">
          {formatUsdFromMiles(stored, cotizacion)}
        </div>
      )}
    </td>
  );

  return (
    <>
      <SectionTitle variant="sub">Resumen de Montos Involucrados en el Proyecto</SectionTitle>

      <div className="mb-3 rounded-sm border border-l-4 border-border border-l-accent2 bg-white px-3.5 py-2.5 text-[12px] text-ink-muted">
        Los importes se expresan en millones de pesos. Las cifras corresponden
        a valores incrementales respecto a los que se registran antes de la
        ejecución del proyecto.
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="w-[38%] border border-accent-light bg-accent px-2 py-1.5 text-left text-[11px] font-semibold text-white">
                Concepto <span className="font-normal text-white/70">(pesos)</span>
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicio actual (pesos)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicios siguientes (pesos)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Total (pesos)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Previsto en Presupuesto (pesos)
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.path}>
                <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                  {f.label}
                </td>
                {pesosCell(f.path, 'ejActual', f.data?.ejActual)}
                {pesosCell(f.path, 'ejSiguientes', f.data?.ejSiguientes)}
                <td className="border border-border p-0">
                  <CalculatedField value={f.total} className="rounded-none border-0 bg-accent/5" />
                </td>
                {pesosCell(f.path, 'previsto', f.data?.previsto)}
              </tr>
            ))}

            {/* Fila total calculada */}
            <tr>
              <td className="border border-border bg-total px-2 py-1.5 text-[11px] font-bold uppercase">
                Monto total de la erogación (activable + no activable)
              </td>
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.montoTotalEjActual}
                  emphasis="strong"
                  className="rounded-none border-0 bg-total"
                />
              </td>
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.montoTotalEjSiguientes}
                  emphasis="strong"
                  className="rounded-none border-0 bg-total"
                />
              </td>
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.montoTotalTotal}
                  emphasis="strong"
                  className="rounded-none border-0 bg-total"
                />
              </td>
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.montoTotalPrevisto}
                  emphasis="strong"
                  className="rounded-none border-0 bg-total"
                />
              </td>
            </tr>

            {/* Gastos incrementales corrientes (fila aparte) */}
            <tr>
              <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                Gastos incrementales corrientes que ocasionará el proyecto
              </td>
              {pesosCell(
                'caratula.resumenMontos.gastosIncrementales',
                'ejActual',
                resumenMontos?.gastosIncrementales?.ejActual
              )}
              {pesosCell(
                'caratula.resumenMontos.gastosIncrementales',
                'ejSiguientes',
                resumenMontos?.gastosIncrementales?.ejSiguientes
              )}
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.gastosIncrementalesTotal}
                  className="rounded-none border-0 bg-accent/5"
                />
              </td>
              {pesosCell(
                'caratula.resumenMontos.gastosIncrementales',
                'previsto',
                resumenMontos?.gastosIncrementales?.previsto
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Tabla USD (editable en modo USD, mirror en modo pesos) ────────── */}
      <div className="mt-3 mb-1 text-[11px] italic text-ink-muted">
        Equivalente en USD — calculado automáticamente según la cotización
        ingresada arriba. Si la cotización es 0 o está vacía, los valores
        muestran "—".
      </div>
      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="w-[38%] border border-accent-light bg-accent-dark px-2 py-1.5 text-left text-[11px] font-semibold text-white">
                Concepto <span className="font-normal text-white/70">(USD)</span>
              </th>
              <th className="border border-accent-light bg-accent-dark px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicio actual (USD)
              </th>
              <th className="border border-accent-light bg-accent-dark px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicios siguientes (USD)
              </th>
              <th className="border border-accent-light bg-accent-dark px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Total (USD)
              </th>
              <th className="border border-accent-light bg-accent-dark px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Previsto en Presupuesto (USD)
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={`${f.path}-usd`}>
                <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                  {f.label}
                </td>
                {usdCellEditable(f.path, 'ejActual', f.data?.ejActual)}
                {usdCellEditable(f.path, 'ejSiguientes', f.data?.ejSiguientes)}
                <td className={usdCellClass}>
                  {formatUsdFromMiles(f.total, cotizacion)}
                </td>
                {usdCellEditable(f.path, 'previsto', f.data?.previsto)}
              </tr>
            ))}

            {/* Fila total erogación en USD */}
            <tr>
              <td className="border border-border bg-total px-2 py-1.5 text-[11px] font-bold uppercase">
                Monto total de la erogación (activable + no activable)
              </td>
              <td className={usdTotalCellClass}>
                {formatUsdFromMiles(resumen.montoTotalEjActual, cotizacion)}
              </td>
              <td className={usdTotalCellClass}>
                {formatUsdFromMiles(resumen.montoTotalEjSiguientes, cotizacion)}
              </td>
              <td className={usdTotalCellClass}>
                {formatUsdFromMiles(resumen.montoTotalTotal, cotizacion)}
              </td>
              <td className={usdTotalCellClass}>
                {formatUsdFromMiles(resumen.montoTotalPrevisto, cotizacion)}
              </td>
            </tr>

            {/* Gastos incrementales corrientes en USD */}
            <tr>
              <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                Gastos incrementales corrientes que ocasionará el proyecto
              </td>
              {usdCellEditable(
                'caratula.resumenMontos.gastosIncrementales',
                'ejActual',
                resumenMontos?.gastosIncrementales?.ejActual
              )}
              {usdCellEditable(
                'caratula.resumenMontos.gastosIncrementales',
                'ejSiguientes',
                resumenMontos?.gastosIncrementales?.ejSiguientes
              )}
              <td className={usdCellClass}>
                {formatUsdFromMiles(resumen.gastosIncrementalesTotal, cotizacion)}
              </td>
              {usdCellEditable(
                'caratula.resumenMontos.gastosIncrementales',
                'previsto',
                resumenMontos?.gastosIncrementales?.previsto
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Detalle del monto total a invertir ─────────────────────────────────────
function DetalleInversionSection() {
  const { control } = useFormContext<Proyecto>();
  const { detalle } = useCalculatedTotals();
  const cotizacion = useWatch({ control, name: 'caratula.cotizacionUsd' });

  return (
    <>
      <SectionTitle variant="sub">Detalle del Monto Total a Invertir (en millones de pesos)</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activable + No activable */}
        <div className="rounded-sm border border-border bg-white p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
            Activable
          </div>
          <div className="space-y-1.5">
            <MoneyRow label="1. Hardware" control={control} name="caratula.detalleInversion.activable.hardware" />
            <MoneyRow label="2. Software" control={control} name="caratula.detalleInversion.activable.software" />
            <MoneyRow label="3. Otros" control={control} name="caratula.detalleInversion.activable.otros" />
            <TotalRow
              label="Total activable"
              value={detalle.totalActivable}
              cotizacion={cotizacion}
            />
          </div>

          <div className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
            No activable
          </div>
          <DynamicList
            name="caratula.detalleInversion.noActivable"
            conceptoPlaceholder="Concepto (ej: capacitación externa)"
            addLabel="+ Agregar concepto no activable"
            emptyMessage="Sin conceptos — agregá uno para comenzar."
          />
          <TotalRow
            label="Total no activable"
            value={detalle.totalNoActivable}
            cotizacion={cotizacion}
          />

          <TotalRow
            label="Total costo de la inversión"
            value={detalle.totalInversion}
            emphasis="strong"
            className="mt-3"
            cotizacion={cotizacion}
          />
        </div>

        {/* Gastos incrementales corrientes */}
        <div className="rounded-sm border border-border bg-white p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
            Gastos Incrementales Corrientes
          </div>
          <DynamicList
            name="caratula.detalleInversion.gastosIncrementales"
            conceptoPlaceholder="Concepto (ej: mantenimiento anual)"
            addLabel="+ Agregar gasto incremental"
          />
          <TotalRow
            label="Total gastos incrementales corrientes"
            value={detalle.totalGastosIncrementales}
            cotizacion={cotizacion}
          />
        </div>
      </div>
    </>
  );
}

// ─── Información complementaria TI ──────────────────────────────────────────
function InfoTISection() {
  const { control } = useFormContext<Proyecto>();
  const { ti } = useCalculatedTotals();
  const cotizacion = useWatch({ control, name: 'caratula.cotizacionUsd' });

  return (
    <>
      <SectionTitle variant="sub">
        Información Complementaria sobre Proyectos Informáticos
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-sm border border-border bg-white p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
            Detalle de Costos de Hardware
          </div>
          <div className="space-y-1.5">
            <MoneyRow label="1. Costo de equipos informáticos" control={control} name="caratula.infoTI.hardware.equipos" />
            <MoneyRow label="2. Costos de instalación" control={control} name="caratula.infoTI.hardware.instalacion" />
            <MoneyRow label="3. Otros costos" control={control} name="caratula.infoTI.hardware.otros" />
            <TotalRow
              label="Total costos de Hardware"
              value={ti.totalHardware}
              cotizacion={cotizacion}
            />
          </div>
        </div>

        <div className="rounded-sm border border-border bg-white p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
            Detalle de Costos de Software
          </div>
          <div className="space-y-1.5">
            <MoneyRow label="1. Licencias" control={control} name="caratula.infoTI.software.licencias" />
            <MoneyRow label="2. Apoyo externo" control={control} name="caratula.infoTI.software.apoyoExterno" />
            <MoneyRow label="3. Otros costos" control={control} name="caratula.infoTI.software.otros" />
            <TotalRow
              label="Total costos de Software"
              value={ti.totalSoftware}
              cotizacion={cotizacion}
            />
            <TotalRow
              label="Total Hardware + Software"
              value={ti.totalHwSw}
              emphasis="strong"
              className="mt-2"
              cotizacion={cotizacion}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── B. Evaluación económica ────────────────────────────────────────────────
function EvaluacionEconomicaSection() {
  const { register } = useFormContext<Proyecto>();
  const numberRegister = (name: Parameters<typeof register>[0]) =>
    register(name, {
      setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    });

  return (
    <>
      <SectionTitle>B. Resultados de la Evaluación Económica</SectionTitle>
      <div className="mb-3 rounded-sm border border-l-4 border-border border-l-accent2 bg-white px-3.5 py-2.5 text-[12px] text-ink-muted">
        Completar si correspondiera, según las características del proyecto.
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Horizonte de la evaluación (meses)" orientation="column">
            <Input type="number" step="1" min="0" {...numberRegister('caratula.evaluacion.horizonteMeses')} />
          </Field>
          <Field label="Tasa Interna de Retorno anual (TIR) %" orientation="column">
            <Input type="number" step="0.01" {...numberRegister('caratula.evaluacion.tir')} />
          </Field>
          <Field label="Tasa de corte %" orientation="column">
            <Input type="number" step="0.01" {...numberRegister('caratula.evaluacion.tasaCorte')} />
          </Field>
          <Field label="Valor Actual Neto (VAN, en millones de pesos)" orientation="column">
            <Input type="number" step="0.01" {...numberRegister('caratula.evaluacion.van')} />
          </Field>
          <Field label="Período de repago (meses)" orientation="column">
            <Input type="number" step="1" min="0" {...numberRegister('caratula.evaluacion.periodoRepagoMeses')} />
          </Field>
        </div>
      </Card>
    </>
  );
}

// ─── Opiniones ──────────────────────────────────────────────────────────────
function OpinionesSection() {
  const { register } = useFormContext<Proyecto>();
  return (
    <>
      <SectionTitle variant="sub">Opiniones y Comentarios</SectionTitle>
      <div className="mb-3 rounded-sm border border-l-4 border-border border-l-accent2 bg-white px-3.5 py-2.5 text-[12px] text-ink-muted">
        Dejar en blanco — se llena a mano en el resumen ejecutivo.
      </div>
      <Card>
        <Field label="Planeamiento Estratégico y Control de Gestión" labelWidth="280px">
          <TextArea rows={3} {...register('caratula.opiniones.planeamiento')} />
        </Field>
        <Field label="Administración y Finanzas" labelWidth="280px">
          <TextArea rows={3} {...register('caratula.opiniones.administracion')} />
        </Field>
        <Field label="Áreas de Apoyo" labelWidth="280px">
          <TextArea rows={3} {...register('caratula.opiniones.areasApoyo')} />
        </Field>
      </Card>
    </>
  );
}

// ─── Helpers locales ────────────────────────────────────────────────────────
import type { Control, FieldPath } from 'react-hook-form';

/**
 * Fila de "label + MoneyInput" con grid de 2 columnas. La columna del input
 * tiene ancho fijo así todas las filas del bloque (Hardware, Software, Otros,
 * etc.) arrancan el input exactamente en el mismo x.
 */
function MoneyRow({
  label,
  control,
  name,
}: {
  label: string;
  control: Control<Proyecto>;
  name: FieldPath<Proyecto>;
}) {
  return (
    <div className="grid grid-cols-[1fr_170px] items-center gap-3">
      <span className="text-[12px]">{label}</span>
      <MoneyInput control={control} name={name} />
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasis = 'normal',
  className = '',
  cotizacion,
}: {
  label: string;
  value: number;
  emphasis?: 'normal' | 'strong';
  className?: string;
  /** Si se pasa, se renderiza un renglón extra con el valor en USD debajo. */
  cotizacion?: number | null | undefined;
}) {
  const isStrong = emphasis === 'strong';
  const weight = isStrong ? 'font-bold' : 'font-semibold';
  const hasUsd = cotizacion !== undefined;

  if (!hasUsd) {
    return (
      <div
        className={`grid grid-cols-[1fr_170px] items-center gap-3 border-t border-border pt-1.5 ${className}`}
      >
        <span className={`text-[12px] ${weight}`}>{label}</span>
        <CalculatedField value={value} emphasis={emphasis} />
      </div>
    );
  }

  const usdClass = `rounded-sm border border-accent/20 bg-white px-2 py-1.5 text-right font-mono text-accent ${
    isStrong ? 'text-[13px] font-bold' : 'text-[12px] font-semibold'
  }`;

  return (
    <div
      className={`my-1.5 rounded-sm border-l-[3px] border-l-accent bg-accent/10 py-1.5 pl-2 pr-1 ${className}`}
    >
      <div className="grid grid-cols-[1fr_170px] items-center gap-3">
        <span className={`text-[12px] ${weight}`}>
          {label} <span className="font-normal text-ink-muted">(pesos)</span>
        </span>
        <CalculatedField value={value} emphasis={emphasis} />
      </div>
      <div className="mt-1 grid grid-cols-[1fr_170px] items-center gap-3">
        <span className={`text-[12px] ${weight}`}>
          {label} <span className="font-normal text-ink-muted">(USD)</span>
        </span>
        <div className={usdClass}>{formatUsdFromMiles(value, cotizacion)}</div>
      </div>
    </div>
  );
}
