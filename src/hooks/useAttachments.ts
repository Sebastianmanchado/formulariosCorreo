import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { nuevoArchivoMeta, type ArchivoMeta } from '../schemas/proyecto';
import { logger } from '../utils/logger';

export interface AttachmentsApi {
  /** Apunta add/remove/getBlob/clearAll al APEM indicado. */
  setActive: (id: string) => void;
  /** Registra blobs en memoria del APEM activo y devuelve los metadatos. */
  add: (files: FileList | File[]) => ArchivoMeta[];
  /** Elimina el blob asociado a ese id en el APEM activo. */
  remove: (id: string) => void;
  /** Devuelve el File si está en memoria del APEM activo. */
  getBlob: (id: string) => File | undefined;
  /** True si el APEM activo tiene un blob para ese id. */
  has: (id: string) => boolean;
  /** Borra los blobs del APEM activo. */
  clearAll: () => void;
  /** Borra los blobs de un APEM (al eliminarlo de la lista). */
  clearProject: (id: string) => void;
}

const AttachmentsCtx = createContext<AttachmentsApi | null>(null);

/**
 * Adjuntos en memoria, separados por APEM. Cambiar de APEM no pierde los
 * archivos de los otros mientras la pestaña siga abierta. Recargar la página
 * sigue perdiendo los blobs y conserva solo el nombre en el borrador.
 */
export function AttachmentsProvider({
  initialActiveId,
  children,
}: {
  initialActiveId: string;
  children: ReactNode;
}) {
  const bucketsRef = useRef(new Map<string, Map<string, File>>());
  const activeIdRef = useRef(initialActiveId);

  const api = useMemo<AttachmentsApi>(() => {
    const bucket = (id: string) => {
      let map = bucketsRef.current.get(id);
      if (!map) {
        map = new Map();
        bucketsRef.current.set(id, map);
      }
      return map;
    };

    return {
      setActive: (id: string) => {
        activeIdRef.current = id;
        bucket(id);
      },
      add: (files) => {
        const metas: ArchivoMeta[] = [];
        const map = bucket(activeIdRef.current);
        for (const file of Array.from(files)) {
          const meta = nuevoArchivoMeta(file);
          map.set(meta.id, file);
          metas.push(meta);
          logger.info('attachment.added', {
            id: meta.id,
            name: meta.name,
            size: meta.size,
            type: meta.type,
          });
        }
        return metas;
      },
      remove: (id) => {
        bucket(activeIdRef.current).delete(id);
        logger.info('attachment.removed', { id });
      },
      getBlob: (id) => bucket(activeIdRef.current).get(id),
      has: (id) => bucket(activeIdRef.current).has(id),
      clearAll: () => {
        const id = activeIdRef.current;
        const count = bucket(id).size;
        bucketsRef.current.set(id, new Map());
        logger.info('attachments.cleared', { count, proyectoId: id });
      },
      clearProject: (id) => {
        const count = bucketsRef.current.get(id)?.size ?? 0;
        bucketsRef.current.delete(id);
        logger.info('attachments.cleared', { count, proyectoId: id });
      },
    };
  }, []);

  return createElement(AttachmentsCtx.Provider, { value: api }, children);
}

export function useAttachments(): AttachmentsApi {
  const ctx = useContext(AttachmentsCtx);
  if (!ctx) {
    throw new Error('useAttachments debe usarse dentro de <AttachmentsProvider>.');
  }
  return ctx;
}
