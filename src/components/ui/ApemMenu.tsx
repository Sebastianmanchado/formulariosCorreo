import { useEffect, useId, useRef, useState } from 'react';
import type { ApemSummary } from '../../hooks/useLocalStorage';

type Props = {
  items: ApemSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ApemMenu({ items, activeId, onOpen, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-sm border border-white/30 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
      >
        APEMs guardados ({items.length})
      </button>
      {open && (
        <div
          id={panelId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 max-h-80 w-[340px] overflow-y-auto rounded-sm border border-border bg-white py-1 text-ink shadow-lg"
        >
          {items.map((item) => {
            const selected = item.id === activeId;
            return (
              <div
                key={item.id}
                className={`flex items-stretch gap-1 px-1 ${selected ? 'bg-accent/10' : ''}`}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpen(item.id);
                    setOpen(false);
                  }}
                  className="min-w-0 flex-1 px-2 py-2 text-left hover:bg-section"
                >
                  <span className="block truncate text-[13px] font-semibold">
                    {item.denominacion}
                  </span>
                  {item.subdireccion && (
                    <span className="block truncate text-[11px] text-ink-muted">
                      {item.subdireccion}
                    </span>
                  )}
                  <span className="block text-[11px] text-ink-muted">
                    {formatStamp(item.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      `¿Eliminar “${item.denominacion}”? Esta acción no se puede deshacer.`
                    );
                    if (!ok) return;
                    onDelete(item.id);
                    setOpen(false);
                  }}
                  className="shrink-0 self-center rounded-sm px-2 py-1 text-[11px] font-medium text-accent2 hover:bg-section"
                >
                  Eliminar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}
