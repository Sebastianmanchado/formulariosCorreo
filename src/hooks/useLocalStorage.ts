import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { normalizarEncabezado } from '../data/organigrama';
import { crearProyectoVacio, proyectoSchema, type Proyecto } from '../schemas/proyecto';
import { logger } from '../utils/logger';

/**
 * Catálogo de APEM en el navegador. Reemplaza el borrador único v3.
 * v1/v2 no se migran (montos en otra unidad). v3 se importa una vez.
 */
export const CATALOG_STORAGE_KEY = 'ad-oo-0136:proyectos:v4';

const LEGACY_V3_KEY = 'ad-oo-0136:proyecto:v3';

const OBSOLETE_STORAGE_KEYS: readonly string[] = [
  'ad-oo-0136:proyecto:v1',
  'ad-oo-0136:proyecto:v2',
];

export type ApemEntry = {
  updatedAt: string;
  data: Proyecto;
};

export type ApemStore = {
  activeId: string;
  proyectos: Record<string, ApemEntry>;
};

export type ApemSummary = {
  id: string;
  denominacion: string;
  subdireccion: string;
  updatedAt: string;
};

export type PersistStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ApemCatalogApi {
  status: PersistStatus;
  lastSavedAt: Date | null;
  activeId: string;
  items: ApemSummary[];
  saveNow: () => void;
  /** Guarda el APEM abierto, crea uno vacío y lo deja activo. */
  createNew: () => void;
  /** Guarda el APEM abierto y abre otro. Devuelve false si ya era el activo. */
  open: (id: string) => boolean;
  /**
   * Saca un APEM de la lista. Si era el abierto, activa otro (o uno nuevo
   * vacío). Devuelve true cuando cambió el APEM en pantalla.
   */
  remove: (id: string) => boolean;
}

type AttachmentSwitch = {
  setActive: (id: string) => void;
  clearProject: (id: string) => void;
};

interface Options {
  debounceMs?: number;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `apem-${Math.random().toString(36).slice(2, 12)}`;
}

function purgeObsolete(): void {
  if (typeof window === 'undefined') return;
  for (const key of OBSOLETE_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // noop
    }
  }
}

function sanitizar(proyecto: Proyecto): Proyecto {
  const enc = proyecto.caratula.encabezado;
  const norm = normalizarEncabezado(
    enc.subdireccion ?? '',
    enc.direccion ?? '',
    enc.gerencia ?? ''
  );
  if (
    norm.subdireccion === (enc.subdireccion ?? '') &&
    norm.direccion === (enc.direccion ?? '') &&
    norm.gerencia === (enc.gerencia ?? '')
  ) {
    return proyecto;
  }
  return {
    ...proyecto,
    caratula: {
      ...proyecto.caratula,
      encabezado: { ...enc, ...norm },
    },
  };
}

function summaryOf(id: string, entry: ApemEntry): ApemSummary {
  const denominacion = entry.data.caratula?.descripcion?.denominacion?.trim() ?? '';
  return {
    id,
    denominacion: denominacion || 'Sin denominar',
    subdireccion: entry.data.caratula?.encabezado?.subdireccion?.trim() ?? '',
    updatedAt: entry.updatedAt,
  };
}

function readLegacyV3(): Proyecto | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(LEGACY_V3_KEY);
    if (!raw) return undefined;
    const parsed = proyectoSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function emptyStore(): ApemStore {
  const id = newId();
  return {
    activeId: id,
    proyectos: {
      [id]: { updatedAt: new Date().toISOString(), data: crearProyectoVacio() },
    },
  };
}

function parseStore(raw: unknown): ApemStore | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as { activeId?: unknown; proyectos?: unknown };
  if (!obj.proyectos || typeof obj.proyectos !== 'object') return undefined;

  const proyectos: Record<string, ApemEntry> = {};
  for (const [id, entry] of Object.entries(obj.proyectos as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { updatedAt?: unknown; data?: unknown };
    const parsed = proyectoSchema.safeParse(record.data);
    if (!parsed.success) continue;
    proyectos[id] = {
      updatedAt:
        typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
      data: sanitizar(parsed.data),
    };
  }

  const ids = Object.keys(proyectos);
  if (ids.length === 0) return undefined;
  const activeId =
    typeof obj.activeId === 'string' && proyectos[obj.activeId]
      ? obj.activeId
      : [...ids].sort((a, b) => proyectos[b].updatedAt.localeCompare(proyectos[a].updatedAt))[0];
  return { activeId, proyectos };
}

function writeStore(store: ApemStore): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function cloneProyecto(proyecto: Proyecto): Proyecto {
  return structuredClone(proyecto);
}

/** Inputs numéricos con estado local no siempre siguen un reset a `undefined`. */
function reaplicarCamposNumericos(methods: UseFormReturn<Proyecto>, data: Proyecto) {
  const evaluacion = data.caratula?.evaluacion;
  methods.setValue('caratula.cotizacionUsd', data.caratula?.cotizacionUsd, {
    shouldDirty: false,
  });
  methods.setValue('caratula.evaluacion.horizonteMeses', evaluacion?.horizonteMeses, {
    shouldDirty: false,
  });
  methods.setValue('caratula.evaluacion.tir', evaluacion?.tir, { shouldDirty: false });
  methods.setValue('caratula.evaluacion.tasaCorte', evaluacion?.tasaCorte, {
    shouldDirty: false,
  });
  methods.setValue('caratula.evaluacion.van', evaluacion?.van, { shouldDirty: false });
  methods.setValue('caratula.evaluacion.periodoRepagoMeses', evaluacion?.periodoRepagoMeses, {
    shouldDirty: false,
  });
}

function cargarEnFormulario(methods: UseFormReturn<Proyecto>, data: Proyecto) {
  const copia = cloneProyecto(data);
  methods.reset(copia);
  reaplicarCamposNumericos(methods, copia);
}

/** Lee el catálogo, migra el borrador v3 si todavía no hay v4, o crea uno vacío. */
export function loadApemStore(): ApemStore {
  purgeObsolete();
  if (typeof window === 'undefined') return emptyStore();

  try {
    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = parseStore(JSON.parse(raw));
      if (parsed) {
        logger.info('catalog.loaded', { count: Object.keys(parsed.proyectos).length });
        return parsed;
      }
      logger.error('catalog.parse_failed');
    }
  } catch {
    logger.error('catalog.parse_failed');
  }

  const legacy = readLegacyV3();
  const id = newId();
  const data = legacy ? sanitizar(legacy) : crearProyectoVacio();
  const store: ApemStore = {
    activeId: id,
    proyectos: { [id]: { updatedAt: new Date().toISOString(), data } },
  };
  writeStore(store);
  if (legacy) {
    try {
      window.localStorage.removeItem(LEGACY_V3_KEY);
    } catch {
      // noop
    }
    logger.info('catalog.migrated_v3', { id });
  } else {
    logger.info('catalog.created', { id });
  }
  return store;
}

/**
 * Autoguarda el formulario dentro del APEM activo y expone alta, apertura
 * y baja del catálogo. Los archivos adjuntos se conmutan aparte, por id.
 */
export function useApemCatalog(
  methods: UseFormReturn<Proyecto>,
  boot: ApemStore,
  attachments: AttachmentSwitch,
  { debounceMs = 500 }: Options = {}
): ApemCatalogApi {
  const [store, setStore] = useState(boot);
  const [status, setStatus] = useState<PersistStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const storeRef = useRef(boot);
  const activeIdRef = useRef(boot.activeId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((values: Proyecto, trigger: 'auto' | 'manual'): boolean => {
    const id = activeIdRef.current;
    const next: ApemStore = {
      activeId: id,
      proyectos: {
        ...storeRef.current.proyectos,
        [id]: { updatedAt: new Date().toISOString(), data: cloneProyecto(values) },
      },
    };
    const ok = writeStore(next);
    if (ok) {
      storeRef.current = next;
      setStore(next);
      setStatus('saved');
      setLastSavedAt(new Date());
      logger.info('draft.saved', { trigger, id });
    } else {
      setStatus('error');
      logger.error('draft.save_failed', { trigger, id });
    }
    return ok;
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback((): boolean => {
    cancelTimer();
    return commit(methods.getValues(), 'manual');
  }, [cancelTimer, commit, methods]);

  useEffect(() => {
    const sub = methods.watch(() => {
      setStatus('saving');
      cancelTimer();
      timerRef.current = setTimeout(() => {
        commit(methods.getValues(), 'auto');
      }, debounceMs);
    });
    return () => {
      sub.unsubscribe();
      cancelTimer();
    };
  }, [methods, commit, cancelTimer, debounceMs]);

  const createNew = useCallback(() => {
    if (!flush()) return;
    const id = newId();
    const data = crearProyectoVacio();
    const next: ApemStore = {
      activeId: id,
      proyectos: {
        ...storeRef.current.proyectos,
        [id]: { updatedAt: new Date().toISOString(), data },
      },
    };
    if (!writeStore(next)) {
      setStatus('error');
      logger.error('catalog.create_failed');
      return;
    }
    activeIdRef.current = id;
    storeRef.current = next;
    setStore(next);
    setStatus('saved');
    setLastSavedAt(new Date());
    attachments.setActive(id);
    cargarEnFormulario(methods, data);
    logger.info('catalog.created', { id });
  }, [attachments, flush, methods]);

  const open = useCallback(
    (id: string): boolean => {
      if (id === activeIdRef.current) return false;
      const entry = storeRef.current.proyectos[id];
      if (!entry) return false;
      if (!flush()) return false;
      const next: ApemStore = { ...storeRef.current, activeId: id };
      if (!writeStore(next)) {
        setStatus('error');
        return false;
      }
      activeIdRef.current = id;
      storeRef.current = next;
      setStore(next);
      attachments.setActive(id);
      cargarEnFormulario(methods, entry.data);
      const savedAt = new Date(entry.updatedAt);
      setLastSavedAt(Number.isNaN(savedAt.getTime()) ? new Date() : savedAt);
      setStatus('saved');
      logger.info('catalog.opened', { id });
      return true;
    },
    [attachments, flush, methods]
  );

  const remove = useCallback(
    (id: string): boolean => {
      if (!storeRef.current.proyectos[id]) return false;
      const isActive = id === activeIdRef.current;
      if (isActive) cancelTimer();

      const proyectos = { ...storeRef.current.proyectos };
      delete proyectos[id];

      let nextActive = storeRef.current.activeId;
      let dataToLoad: Proyecto | null = null;
      if (isActive) {
        const others = Object.entries(proyectos).sort((a, b) =>
          b[1].updatedAt.localeCompare(a[1].updatedAt)
        );
        if (others.length === 0) {
          const freshId = newId();
          const data = crearProyectoVacio();
          proyectos[freshId] = { updatedAt: new Date().toISOString(), data };
          nextActive = freshId;
          dataToLoad = data;
        } else {
          nextActive = others[0][0];
          dataToLoad = others[0][1].data;
        }
      }

      const next: ApemStore = { activeId: nextActive, proyectos };
      if (!writeStore(next)) {
        setStatus('error');
        logger.error('catalog.remove_failed', { id });
        return false;
      }
      storeRef.current = next;
      setStore(next);
      attachments.clearProject(id);
      if (isActive && dataToLoad) {
        activeIdRef.current = nextActive;
        attachments.setActive(nextActive);
        cargarEnFormulario(methods, dataToLoad);
        setStatus('saved');
        setLastSavedAt(new Date());
      }
      logger.info('catalog.removed', { id, nextActive });
      return isActive;
    },
    [attachments, cancelTimer, methods]
  );

  const items = useMemo(
    () =>
      Object.entries(store.proyectos)
        .map(([id, entry]) => summaryOf(id, entry))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [store]
  );

  return {
    status,
    lastSavedAt,
    activeId: store.activeId,
    items,
    saveNow: flush,
    createNew,
    open,
    remove,
  };
}
