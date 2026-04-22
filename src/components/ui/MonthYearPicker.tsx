import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  useFormContext,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { formatMonth } from '../../utils/formatters';

const MONTH_SHORT = [
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sep.',
  'oct.',
  'nov.',
  'dic.',
] as const;

const YM_RE = /^(\d{4})-(\d{2})$/;

type Props<T extends FieldValues> = {
  name: Path<T>;
  /** Cuántos años antes del actual incluir. Default: 5. */
  yearsBefore?: number;
  /** Cuántos años después del actual incluir. Default: 15. */
  yearsAfter?: number;
};

/**
 * Picker mes/año con disclosure progresivo:
 *   1. Click en el trigger → popover muestra **solo años** scrollables.
 *   2. Click en un año → la vista se reemplaza por la grilla 4×3 de meses.
 *   3. Click en un mes → commit `"YYYY-MM"` y cierra.
 *   4. Flecha "←" vuelve a la vista de años sin perder lo guardado.
 *
 * Persiste como `"YYYY-MM"` → compatible con el schema, los cálculos y el PDF.
 */
export function MonthYearPicker<T extends FieldValues>({
  name,
  yearsBefore = 5,
  yearsAfter = 15,
}: Props<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Inner
          value={(field.value as string | undefined) ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          yearsBefore={yearsBefore}
          yearsAfter={yearsAfter}
        />
      )}
    />
  );
}

type View = 'years' | 'months';

type InnerProps = {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  yearsBefore: number;
  yearsAfter: number;
};

function Inner({ value, onChange, onBlur, yearsBefore, yearsAfter }: InnerProps) {
  const parsed = YM_RE.exec(value);
  const selectedYear = parsed ? parsed[1] : null;
  const selectedMonth = parsed ? parsed[2] : null;

  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('years');
  const [viewYear, setViewYear] = useState<number>(
    parsed ? parseInt(parsed[1], 10) : currentYear
  );

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  // Si el valor externo cambia (reset del form), reposicionar.
  useEffect(() => {
    const p = YM_RE.exec(value);
    if (p) setViewYear(parseInt(p[1], 10));
  }, [value]);

  // Al abrir: arrancar en la vista más útil según el valor actual.
  const handleOpen = () => {
    const p = YM_RE.exec(value);
    if (p) {
      setViewYear(parseInt(p[1], 10));
      setView('months');
    } else {
      setViewYear(currentYear);
      setView('years');
    }
    setOpen(true);
  };

  // En la vista de años: scrollear al año en foco.
  useEffect(() => {
    if (!open || view !== 'years') return;
    requestAnimationFrame(() => {
      const el = yearListRef.current?.querySelector<HTMLButtonElement>(
        `[data-year="${viewYear}"]`
      );
      el?.scrollIntoView({ block: 'center' });
    });
  }, [open, view, viewYear]);

  // Cerrar con click fuera o Escape.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !popupRef.current?.contains(t)
      ) {
        setOpen(false);
        onBlur?.();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'months') {
          setView('years');
        } else {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, view, onBlur]);

  const years: number[] = [];
  for (let y = currentYear - yearsBefore; y <= currentYear + yearsAfter; y++) {
    years.push(y);
  }

  const display = formatMonth(value);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-sm border border-border-input bg-white px-2 py-1.5 text-left text-[13px] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        <span className={display ? '' : 'italic text-ink-muted/60'}>
          {display || '— seleccionar —'}
        </span>
        <ChevronDown />
      </button>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Seleccionar mes y año"
          className="absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-sm border border-border bg-white shadow-lg"
        >
          {view === 'years' ? (
            <>
              <div className="border-b border-border bg-accent px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                Elegí un año
              </div>
              <div
                ref={yearListRef}
                className="max-h-60 overflow-y-auto bg-white"
              >
                {years.map((y) => {
                  const isSelected = selectedYear === String(y);
                  const isCurrent = y === currentYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      onClick={() => {
                        setViewYear(y);
                        setView('months');
                      }}
                      className={`block w-full px-4 py-2 text-left text-[13px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : isCurrent
                            ? 'bg-section text-accent hover:bg-accent hover:text-white'
                            : 'text-ink hover:bg-section'
                      }`}
                    >
                      {y}
                      {isCurrent && !isSelected && (
                        <span className="ml-2 text-[10px] font-normal uppercase text-ink-muted">
                          hoy
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border bg-accent px-2 py-1.5 text-white">
                <button
                  type="button"
                  onClick={() => setView('years')}
                  aria-label="Volver a la selección de año"
                  className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-white/10"
                >
                  <ChevronLeft />
                </button>
                <span className="text-[12px] font-semibold uppercase tracking-wide">
                  {viewYear}
                </span>
                <span className="h-6 w-6" />
              </div>
              <div className="grid grid-cols-4 gap-1 bg-white p-2">
                {MONTH_SHORT.map((label, i) => {
                  const mm = String(i + 1).padStart(2, '0');
                  const isSelected =
                    selectedYear === String(viewYear) && selectedMonth === mm;
                  return (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => {
                        onChange(`${viewYear}-${mm}`);
                        setOpen(false);
                        onBlur?.();
                      }}
                      className={`rounded-sm py-1.5 text-[12px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'text-ink hover:bg-section'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-border bg-section/60 px-3 py-1.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                onBlur?.();
              }}
              className="text-[11px] font-medium text-ink-muted transition-colors hover:text-accent2"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBlur?.();
              }}
              className="text-[11px] font-medium text-ink-muted transition-colors hover:text-accent"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-ink-muted"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 0 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.94 10l3.83 3.71a.75.75 0 1 1-1.04 1.08l-4.39-4.25a.75.75 0 0 1 0-1.08l4.39-4.25a.75.75 0 0 1 1.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}
