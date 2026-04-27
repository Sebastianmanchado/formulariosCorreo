import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  useFormContext,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import type { Proyecto } from '../../schemas/proyecto';
import { formatMoney, parseMoney } from '../../utils/formatters';

type InnerProps = {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  suffix?: string;
  disabled?: boolean;
  id?: string;
  /** Coordenadas para useGridNavigation (opcional). */
  gridRow?: number;
  gridCol?: number;
};

/**
 * Input de monto con formato es-AR:
 *  • Mientras está enfocado muestra los dígitos crudos para edición cómoda.
 *  • Al perder el foco muestra el valor con separadores de miles.
 *  • Propaga el valor como `number | undefined` a React Hook Form en cada tecla.
 */
function MoneyInputInner({
  value,
  onChange,
  onBlur,
  placeholder,
  className = '',
  inputClassName = '',
  suffix,
  disabled,
  id,
  gridRow,
  gridCol,
}: InnerProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState<string>(() =>
    value === null || value === undefined ? '' : String(value)
  );
  const lastExternal = useRef<number | null | undefined>(value);

  // Sync `raw` con `value` cuando este cambia desde afuera (reset, setValue
  // programático, etc.). Antes este efecto sólo corría si el input no estaba
  // focuseado, dejando un caso borde: si el usuario clickeaba "Limpiar"
  // mientras tenía el input activo, `raw` quedaba con el texto viejo.
  // Ahora también sincronizamos cuando `value` baja a null/undefined —
  // un clear externo siempre se respeta.
  useEffect(() => {
    if (value === lastExternal.current) return;
    const isExternalClear = value === null || value === undefined;
    if (!focused || isExternalClear) {
      setRaw(isExternalClear ? '' : String(value));
    }
    lastExternal.current = value;
  }, [value, focused]);

  // Si el value efectivo es null/undefined, forzamos display vacío sin
  // importar el estado de foco — así un reset externo siempre limpia el DOM
  // visualmente, aunque el input estuviera focuseado en ese momento.
  const display =
    value === null || value === undefined
      ? ''
      : focused
        ? raw
        : formatMoney(value);

  return (
    <div className={`relative inline-flex w-full items-center ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        data-grid-row={gridRow}
        data-grid-col={gridCol}
        value={display}
        onFocus={(e) => {
          setFocused(true);
          setRaw(value === null || value === undefined ? '' : String(value));
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          lastExternal.current = value;
          onBlur?.();
        }}
        onChange={(e) => {
          const v = e.target.value;
          setRaw(v);
          onChange(parseMoney(v));
        }}
        className={`w-full rounded-sm border border-border-input bg-white px-2 py-1.5 text-right font-mono text-[12px] tabular-nums text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-section disabled:text-ink-muted ${
          suffix ? 'pr-10' : ''
        } ${inputClassName}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 text-2xs text-ink-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  suffix?: string;
  disabled?: boolean;
  id?: string;
  gridRow?: number;
  gridCol?: number;
  /**
   * Forzar el input a una moneda fija, ignorando el toggle global. Útil para
   * la cotización USD (siempre en pesos).
   */
  fixedCurrency?: 'pesos';
};

/**
 * Wrapper de MoneyInput que respeta el toggle `caratula.monedaEntrada`:
 *  • En modo `pesos`: el valor se guarda/muestra tal cual (m$).
 *  • En modo `usd`: el valor se muestra como USD (equivalente del m$ guardado
 *    con la cotización) y se reconvierte a m$ al editar.
 *  • Si `fixedCurrency="pesos"` se pasa, siempre se comporta como pesos.
 */
export function MoneyInput<T extends FieldValues>({
  control,
  name,
  fixedCurrency,
  suffix,
  ...rest
}: Props<T>) {
  // Tipamos el context con Proyecto para poder observar los campos globales.
  const { control: proyectoCtrl } = useFormContext<Proyecto>();
  const monedaEntrada = useWatch({
    control: proyectoCtrl,
    name: 'caratula.monedaEntrada',
  });
  const cotizacion = useWatch({
    control: proyectoCtrl,
    name: 'caratula.cotizacionUsd',
  });

  // Modo efectivo del input: si está forzado a pesos, siempre pesos.
  // Si el modo global es USD pero la cotización no es válida, degrada a pesos
  // para no inhabilitar inputs cuando falta el dato.
  const cotizacionValida =
    typeof cotizacion === 'number' && cotizacion > 0 && Number.isFinite(cotizacion);
  const modeUsd =
    fixedCurrency !== 'pesos' &&
    monedaEntrada === 'usd' &&
    cotizacionValida;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const stored = field.value as number | null | undefined;

        const displayValue: number | null | undefined = modeUsd
          ? stored === null || stored === undefined
            ? stored
            : (stored * 1_000_000) / (cotizacion as number)
          : stored;

        const handleChange = (next: number | undefined) => {
          if (modeUsd && next !== undefined) {
            // USD totales ingresado → a millones de pesos para guardar.
            field.onChange((next * (cotizacion as number)) / 1_000_000);
          } else {
            field.onChange(next);
          }
        };

        return (
          <MoneyInputInner
            value={displayValue}
            onChange={handleChange}
            onBlur={field.onBlur}
            suffix={suffix}
            {...rest}
          />
        );
      }}
    />
  );
}
