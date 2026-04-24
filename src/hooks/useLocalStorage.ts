import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { proyectoSchema, type Proyecto } from '../schemas/proyecto';

/**
 * Clave versionada del storage. Bumpeala si el schema cambia de forma
 * incompatible — así los borradores viejos se descartan automáticamente
 * en vez de romper la carga.
 *
 * v3: montos en millones de pesos (antes en miles). No se migran los v1/v2
 *     porque los valores quedarían 1000× más grandes.
 */
export const PROYECTO_STORAGE_KEY = 'ad-oo-0136:proyecto:v3';

/** Claves obsoletas que NO se migran — se borran al detectarlas. */
const OBSOLETE_STORAGE_KEYS: readonly string[] = [
  'ad-oo-0136:proyecto:v1',
  'ad-oo-0136:proyecto:v2',
];

// ─── Primitivas de lectura/escritura ────────────────────────────────────────

function readAndParse(key: string): Proyecto | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = proyectoSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function loadProyectoFromStorage(): Proyecto | undefined {
  // Limpieza de borradores incompatibles de versiones anteriores (no se migran).
  if (typeof window !== 'undefined') {
    for (const k of OBSOLETE_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // noop
      }
    }
  }
  return readAndParse(PROYECTO_STORAGE_KEY);
}

export function saveProyectoToStorage(proyecto: Proyecto): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PROYECTO_STORAGE_KEY, JSON.stringify(proyecto));
    return true;
  } catch {
    return false;
  }
}

export function clearProyectoStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROYECTO_STORAGE_KEY);
  } catch {
    // noop
  }
}

// ─── Hook de persistencia ───────────────────────────────────────────────────

export type PersistStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PersistApi {
  status: PersistStatus;
  lastSavedAt: Date | null;
  saveNow: () => void;
  clearStorage: () => void;
}

interface Options {
  /** Milisegundos de debounce antes de escribir a localStorage. */
  debounceMs?: number;
  /** Si es true, no se suscribe a cambios (útil para tests). */
  disabled?: boolean;
}

/**
 * Auto-persiste el formulario en localStorage:
 *   • Se suscribe a `methods.watch`.
 *   • Hace debounce y escribe una sola vez por ventana.
 *   • Expone estado (`idle` | `saving` | `saved` | `error`) + `lastSavedAt`.
 *   • Provee `saveNow()` (flush inmediato) y `clearStorage()`.
 */
export function useProyectoPersist(
  methods: UseFormReturn<Proyecto>,
  { debounceMs = 500, disabled = false }: Options = {}
): PersistApi {
  const [status, setStatus] = useState<PersistStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((values: Proyecto) => {
    const ok = saveProyectoToStorage(values);
    if (ok) {
      setStatus('saved');
      setLastSavedAt(new Date());
    } else {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    const sub = methods.watch((values) => {
      setStatus('saving');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        commit(values as Proyecto);
      }, debounceMs);
    });
    return () => {
      sub.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [methods, commit, debounceMs, disabled]);

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commit(methods.getValues());
  }, [commit, methods]);

  const clearStorage = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearProyectoStorage();
    setStatus('idle');
    setLastSavedAt(null);
  }, []);

  return { status, lastSavedAt, saveNow, clearStorage };
}
