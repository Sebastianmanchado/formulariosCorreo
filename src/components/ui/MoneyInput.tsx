import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
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

  useEffect(() => {
    if (!focused && value !== lastExternal.current) {
      setRaw(value === null || value === undefined ? '' : String(value));
      lastExternal.current = value;
    }
  }, [value, focused]);

  const display = focused ? raw : formatMoney(value);

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
          // Seleccionar todo al enfocar: así Delete/Backspace o cualquier
          // tecla nueva sobrescribe el valor (UX tipo planilla).
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
};

export function MoneyInput<T extends FieldValues>({
  control,
  name,
  ...rest
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <MoneyInputInner
          value={field.value as number | null | undefined}
          onChange={field.onChange}
          onBlur={field.onBlur}
          {...rest}
        />
      )}
    />
  );
}
