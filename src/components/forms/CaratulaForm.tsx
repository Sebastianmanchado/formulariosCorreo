import { useFormContext, useWatch } from 'react-hook-form';
import { MODALIDADES_EVALUACION, TIPOS_EROGACION } from '../../data/constants';
import { DESCRIPCION_MAX, type Proyecto } from '../../schemas/proyecto';
import { useCalculatedTotals } from '../../hooks/useCalculatedTotals';
import { todayISO } from '../../utils/formatters';
import {
  CalculatedField,
  Card,
  Checkbox,
  DynamicList,
  Field,
  FileDropBox,
  Input,
  MoneyInput,
  OrganigramaSelect,
  SectionTitle,
  Select,
  TextArea,
  TextAreaWithCount,
} from '../ui';

export function CaratulaForm() {
  return (
    <div className="space-y-2">
      <EncabezadoSection />
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
  const { register } = useFormContext<Proyecto>();
  return (
    <>
      <SectionTitle variant="sub">Características Básicas</SectionTitle>
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Mes de inicio del proyecto" orientation="column">
            <Input type="month" {...register('caratula.caracteristicas.mesInicio')} />
          </Field>
          <Field label="Mes de finalización de la erogación" orientation="column">
            <Input type="month" {...register('caratula.caracteristicas.mesFinErogacion')} />
          </Field>
          <Field label="Mes de finalización del proyecto" orientation="column">
            <Input type="month" {...register('caratula.caracteristicas.mesFinProyecto')} />
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

  const filas = [
    {
      label: 'Ingresos / Ahorros incrementales del proyecto',
      path: 'caratula.resumenMontos.ingresosAhorros',
      total: resumen.ingresosAhorrosTotal,
    },
    {
      label: 'Egresos activables (hard, soft, bienes de uso) del proyecto',
      path: 'caratula.resumenMontos.egresosActivables',
      total: resumen.egresosActivablesTotal,
    },
    {
      label: 'Otros egresos activables del proyecto',
      path: 'caratula.resumenMontos.otrosEgresosActivables',
      total: resumen.otrosEgresosActivablesTotal,
    },
    {
      label: 'Gastos adic. no activables (capacitación, mantenimiento, etc.)',
      path: 'caratula.resumenMontos.gastosNoActivables',
      total: resumen.gastosNoActivablesTotal,
    },
  ] as const;

  return (
    <>
      <SectionTitle variant="sub">Resumen de Montos Involucrados en el Proyecto</SectionTitle>
      <div className="mb-3 rounded-sm border border-l-4 border-border border-l-accent2 bg-white px-3.5 py-2.5 text-[12px] text-ink-muted">
        Los importes se expresan en miles de pesos (m$). Las cifras corresponden a
        valores incrementales respecto a los que se registran antes de la ejecución
        del proyecto.
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="w-[38%] border border-accent-light bg-accent px-2 py-1.5 text-left text-[11px] font-semibold text-white">
                Concepto
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicio actual (m$)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Ejercicios siguientes (m$)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Total (m$)
              </th>
              <th className="border border-accent-light bg-accent px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                Previsto en Presupuesto (m$)
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.path}>
                <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                  {f.label}
                </td>
                <td className="border border-border p-0">
                  <MoneyInput
                    control={control}
                    name={`${f.path}.ejActual` as const}
                    inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                  />
                </td>
                <td className="border border-border p-0">
                  <MoneyInput
                    control={control}
                    name={`${f.path}.ejSiguientes` as const}
                    inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                  />
                </td>
                <td className="border border-border p-0">
                  <CalculatedField value={f.total} className="rounded-none border-0 bg-accent/5" />
                </td>
                <td className="border border-border p-0">
                  <MoneyInput
                    control={control}
                    name={`${f.path}.previsto` as const}
                    inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                  />
                </td>
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

            {/* Gastos incrementales corrientes (fila aparte, sin sumar al total de erogación) */}
            <tr>
              <td className="border border-border bg-section px-2 py-1 text-[11px] font-medium">
                Gastos incrementales corrientes que ocasionará el proyecto
              </td>
              <td className="border border-border p-0">
                <MoneyInput
                  control={control}
                  name="caratula.resumenMontos.gastosIncrementales.ejActual"
                  inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                />
              </td>
              <td className="border border-border p-0">
                <MoneyInput
                  control={control}
                  name="caratula.resumenMontos.gastosIncrementales.ejSiguientes"
                  inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                />
              </td>
              <td className="border border-border p-0">
                <CalculatedField
                  value={resumen.gastosIncrementalesTotal}
                  className="rounded-none border-0 bg-accent/5"
                />
              </td>
              <td className="border border-border p-0">
                <MoneyInput
                  control={control}
                  name="caratula.resumenMontos.gastosIncrementales.previsto"
                  inputClassName="border-0 focus:ring-0 rounded-none text-[11px]"
                />
              </td>
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

  return (
    <>
      <SectionTitle variant="sub">Detalle del Monto Total a Invertir (en miles de $)</SectionTitle>
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
            <TotalRow label="Total activable" value={detalle.totalActivable} />
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
          <TotalRow label="Total no activable" value={detalle.totalNoActivable} />

          <TotalRow
            label="Total costo de la inversión"
            value={detalle.totalInversion}
            emphasis="strong"
            className="mt-3"
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
            <TotalRow label="Total costos de Hardware" value={ti.totalHardware} />
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
            <TotalRow label="Total costos de Software" value={ti.totalSoftware} />
            <TotalRow label="Total Hardware + Software" value={ti.totalHwSw} emphasis="strong" className="mt-2" />
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
          <Field label="Valor Actual Neto (VAN, en m$)" orientation="column">
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
}: {
  label: string;
  value: number;
  emphasis?: 'normal' | 'strong';
  className?: string;
}) {
  const isStrong = emphasis === 'strong';
  return (
    <div
      className={`grid grid-cols-[1fr_170px] items-center gap-3 border-t border-border pt-1.5 ${className}`}
    >
      <span className={`text-[12px] ${isStrong ? 'font-bold' : 'font-semibold'}`}>
        {label}
      </span>
      <CalculatedField value={value} emphasis={emphasis} />
    </div>
  );
}
