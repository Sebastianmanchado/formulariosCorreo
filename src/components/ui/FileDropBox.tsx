import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import {
  useFormContext,
  useWatch,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';
import { useAttachments } from '../../hooks/useAttachments';
import type { ArchivoMeta } from '../../schemas/proyecto';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf';
const ACCEPTED_EXT = /\.(png|jpe?g|webp|pdf)$/i;

type Props<T extends FieldValues> = {
  /** Campo del form que guarda `ArchivoMeta[]`. */
  name: Path<T>;
  /** Lista de tipos MIME aceptados. Default: imágenes + PDFs. */
  accept?: string;
  /** Tamaño máximo por archivo, en MB. Default: 10. */
  maxSizeMB?: number;
};

export function FileDropBox<T extends FieldValues>({
  name,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
}: Props<T>) {
  const { control, setValue } = useFormContext<T>();
  const attachments = useAttachments();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = (useWatch({ control, name }) as ArchivoMeta[] | undefined) ?? [];

  const handleAdd = (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const f of Array.from(fileList)) {
      if (!ACCEPTED_EXT.test(f.name) && !accept.includes(f.type)) {
        rejected.push(`${f.name}: tipo no soportado`);
        continue;
      }
      if (f.size > maxBytes) {
        rejected.push(`${f.name}: supera ${maxSizeMB} MB`);
        continue;
      }
      accepted.push(f);
    }

    if (rejected.length > 0) {
      setError(rejected.join(' · '));
    }

    if (accepted.length === 0) return;
    const metas = attachments.add(accepted);
    setValue(
      name,
      [...current, ...metas] as PathValue<T, Path<T>>,
      { shouldDirty: true }
    );
  };

  const handleRemove = (id: string) => {
    attachments.remove(id);
    setValue(
      name,
      current.filter((m) => m.id !== id) as PathValue<T, Path<T>>,
      { shouldDirty: true }
    );
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleAdd(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleAdd(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mt-2 space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-sm border-2 border-dashed px-4 py-3 text-center transition-colors ${
          dragOver
            ? 'border-accent bg-accent/5'
            : 'border-border bg-surface hover:border-accent/60'
        }`}
      >
        <div className="text-[12px] text-ink-muted">
          Arrastrá archivos acá o{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-accent underline underline-offset-2 hover:text-accent-dark"
          >
            seleccioná desde tu equipo
          </button>
          .
          <br />
          <span className="text-[11px]">
            PDF o imágenes (PNG/JPG/WebP) · máx {maxSizeMB} MB por archivo
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={onChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-sm border border-accent2/40 bg-accent2/5 px-3 py-1.5 text-[11px] text-accent2">
          {error}
        </div>
      )}

      {current.length > 0 && (
        <ul className="divide-y divide-border rounded-sm border border-border bg-white">
          {current.map((meta) => (
            <FileRow
              key={meta.id}
              meta={meta}
              inMemory={attachments.has(meta.id)}
              onRemove={() => handleRemove(meta.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({
  meta,
  inMemory,
  onRemove,
}: {
  meta: ArchivoMeta;
  inMemory: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-1.5 text-[12px]">
      <FileIcon type={meta.type} />
      <span className="flex-1 truncate">{meta.name}</span>
      <span className="font-mono text-[10px] text-ink-muted">
        {formatBytes(meta.size)}
      </span>
      {!inMemory && (
        <span
          title="El archivo se perdió al recargar — volvé a subirlo antes de exportar."
          className="rounded-sm bg-accent2/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-accent2"
        >
          falta
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Eliminar ${meta.name}`}
        className="text-ink-muted transition-colors hover:text-accent2"
      >
        ×
      </button>
    </li>
  );
}

function FileIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/');
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold uppercase ${
        isImage
          ? 'bg-accent/10 text-accent'
          : 'bg-accent2/10 text-accent2'
      }`}
      aria-hidden="true"
    >
      {isImage ? 'IMG' : 'PDF'}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
