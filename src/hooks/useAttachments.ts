import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { nuevoArchivoMeta, type ArchivoMeta } from '../schemas/proyecto';

export interface AttachmentsApi {
  /** Registra blobs en memoria y devuelve los metadatos (id/name/type/size). */
  add: (files: FileList | File[]) => ArchivoMeta[];
  /** Elimina el blob asociado a ese id (no toca el schema del form). */
  remove: (id: string) => void;
  /** Devuelve el File si está en memoria, o undefined si el usuario recargó. */
  getBlob: (id: string) => File | undefined;
  /** True si hay un blob asociado a ese id. */
  has: (id: string) => boolean;
  /** Borra todos los blobs. */
  clearAll: () => void;
}

const AttachmentsCtx = createContext<AttachmentsApi | null>(null);

/**
 * Provider de adjuntos. Mantiene un `Map<id, File>` en un ref (no se re-rendea
 * al agregar/quitar). Los archivos viven solo en memoria — si el usuario
 * recarga la página el form conserva los metadatos pero pierde los blobs.
 */
export function AttachmentsProvider({ children }: { children: ReactNode }) {
  const blobsRef = useRef(new Map<string, File>());

  const api = useMemo<AttachmentsApi>(
    () => ({
      add: (files) => {
        const metas: ArchivoMeta[] = [];
        for (const file of Array.from(files)) {
          const meta = nuevoArchivoMeta(file);
          blobsRef.current.set(meta.id, file);
          metas.push(meta);
        }
        return metas;
      },
      remove: (id) => {
        blobsRef.current.delete(id);
      },
      getBlob: (id) => blobsRef.current.get(id),
      has: (id) => blobsRef.current.has(id),
      clearAll: () => {
        blobsRef.current.clear();
      },
    }),
    []
  );

  return createElement(AttachmentsCtx.Provider, { value: api }, children);
}

export function useAttachments(): AttachmentsApi {
  const ctx = useContext(AttachmentsCtx);
  if (!ctx) {
    throw new Error('useAttachments debe usarse dentro de <AttachmentsProvider>.');
  }
  return ctx;
}
