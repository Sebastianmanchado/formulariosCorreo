import { useFormContext, useWatch } from 'react-hook-form';
import type { Proyecto } from '../../schemas/proyecto';

type Props = {
  /**
   * Handler disparado al solicitar cambio de moneda. El padre se encarga de
   * confirmar, resetear el formulario y luego setear el valor.
   */
  onRequestModeChange: (next: 'pesos' | 'usd') => void;
};

/**
 * Toggle de moneda de entrada (pesos / USD). Emite un evento al padre que
 * maneja la confirmación y el reset del formulario. USD queda deshabilitado
 * hasta que exista una cotización válida en la Carátula.
 */
export function MonedaToggle({ onRequestModeChange }: Props) {
  const { control } = useFormContext<Proyecto>();
  const moneda = useWatch({ control, name: 'caratula.monedaEntrada' });
  const cotizacion = useWatch({ control, name: 'caratula.cotizacionUsd' });
  const cotizacionOk =
    typeof cotizacion === 'number' && cotizacion > 0 && Number.isFinite(cotizacion);

  const mode: 'pesos' | 'usd' = moneda === 'usd' && cotizacionOk ? 'usd' : 'pesos';

  const handleClick = (next: 'pesos' | 'usd') => {
    if (next === mode) return;
    if (next === 'usd' && !cotizacionOk) return;
    onRequestModeChange(next);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-sm border border-border bg-white p-0.5"
      role="radiogroup"
      aria-label="Moneda de entrada"
      title={
        cotizacionOk
          ? 'Cambiar de moneda resetea el formulario'
          : 'Ingresá la cotización USD en la Carátula para habilitar el modo USD'
      }
    >
      <Btn
        selected={mode === 'pesos'}
        onClick={() => handleClick('pesos')}
        label="Pesos"
      />
      <Btn
        selected={mode === 'usd'}
        onClick={() => handleClick('usd')}
        label="USD"
        disabled={!cotizacionOk}
      />
    </div>
  );
}

function Btn({
  selected,
  onClick,
  label,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        selected
          ? 'bg-accent text-white'
          : disabled
            ? 'cursor-not-allowed text-ink-muted/50'
            : 'text-ink-muted hover:bg-section hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}
