import type { PersistStatus } from '../../hooks/useLocalStorage';

type Props = {
  status: PersistStatus;
  lastSavedAt: Date | null;
  className?: string;
};

/**
 * Indicador de estado de autosave para el topbar.
 * Variantes:
 *   • idle      → sin cambios todavía (oculto)
 *   • saving    → mientras corre el debounce
 *   • saved     → persistido con timestamp
 *   • error     → ojo rojo, quota / storage no disponible
 */
export function SaveIndicator({ status, lastSavedAt, className = '' }: Props) {
  const base = `flex items-center gap-1.5 font-mono text-[11px] tracking-wide ${className}`;

  if (status === 'idle') {
    return <span className={`${base} text-white/40`}>—</span>;
  }
  if (status === 'saving') {
    return (
      <span className={`${base} text-white/70`}>
        <Dot className="animate-pulse bg-white/70" />
        Guardando…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className={`${base} text-red-200`}>
        <Dot className="bg-red-300" />
        Error al guardar
      </span>
    );
  }
  // saved
  return (
    <span className={`${base} text-white/80`}>
      <Dot className="bg-emerald-400" />
      Guardado{lastSavedAt ? ` · ${formatTime(lastSavedAt)}` : ''}
    </span>
  );
}

function Dot({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
