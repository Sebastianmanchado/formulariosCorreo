import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  useFormContext,
  useWatch,
  type FieldPath,
} from 'react-hook-form';
import { DIRECCIONES, ORGANIGRAMA, gerenciasFor } from '../../data/organigrama';
import type { Proyecto } from '../../schemas/proyecto';

/**
 * Dos combos encadenados: Dirección → Gerencia.
 *
 * Usa un combobox custom (no `<input list>`) para que:
 *   • Siempre se pueda abrir el desplegable clickeando el caret,
 *     sin importar qué haya tipeado el usuario en el textbox.
 *   • Si lo escrito no matchea ninguna opción, caemos al listado completo
 *     como fallback (en vez de esconder el dropdown como hace <datalist>).
 *   • Si la Dirección no está en el organigrama, el combo de Gerencia
 *     muestra la unión de TODAS las gerencias para que el usuario pueda
 *     elegir igual.
 *
 * Al cambiar a una Dirección conocida, se resetea la Gerencia solo si la
 * que había cargada no pertenece a esa nueva Dirección.
 */
export function OrganigramaSelect() {
  const { setValue, control, getValues } = useFormContext<Proyecto>();

  const direccion = useWatch({
    control,
    name: 'caratula.encabezado.direccion',
  });

  // Unión ordenada de todas las gerencias — fallback cuando la Dirección
  // escrita no está en el organigrama.
  const allGerencias = useMemo(
    () =>
      Array.from(new Set(ORGANIGRAMA.flatMap((d) => d.gerencias))).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    []
  );

  const gerenciaOptions = useMemo(() => {
    if (direccion && DIRECCIONES.includes(direccion)) {
      const sub = gerenciasFor(direccion);
      // Direcciones sin gerencias listadas caen al listado global, así el
      // combo nunca queda vacío.
      return sub.length > 0 ? sub : allGerencias;
    }
    return allGerencias;
  }, [direccion, allGerencias]);

  // Si cambiamos a una Dirección conocida distinta, y la Gerencia actual no
  // pertenece a sus gerencias, la reseteamos.
  const prevDireccion = useRef(direccion);
  useEffect(() => {
    if (prevDireccion.current === direccion) return;
    prevDireccion.current = direccion;

    if (!direccion || !DIRECCIONES.includes(direccion)) return;
    const sub = gerenciasFor(direccion);
    if (sub.length === 0) return;
    const currentGerencia = getValues('caratula.encabezado.gerencia');
    if (currentGerencia && !sub.includes(currentGerencia)) {
      setValue('caratula.encabezado.gerencia', '', { shouldDirty: true });
    }
  }, [direccion, getValues, setValue]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Combobox
        name="caratula.encabezado.direccion"
        label="Dirección"
        options={DIRECCIONES}
        placeholder="— seleccionar o escribir —"
      />
      <Combobox
        name="caratula.encabezado.gerencia"
        label="Gerencia"
        options={gerenciaOptions}
        placeholder="— seleccionar o escribir —"
      />
    </div>
  );
}

// ─── Combobox custom ────────────────────────────────────────────────────────

type ComboboxProps = {
  name: FieldPath<Proyecto>;
  options: readonly string[];
  label: string;
  placeholder?: string;
};

function Combobox({ name, options, label, placeholder }: ComboboxProps) {
  const { register, setValue, control } = useFormContext<Proyecto>();
  const rawValue = useWatch({ control, name });
  const value = typeof rawValue === 'string' ? rawValue : '';

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const listId = useId();

  // Cerrar al clickear afuera.
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Siempre mostramos la lista completa — el usuario pidió poder elegir
  // cualquier opción aunque lo tipeado no coincida. Lo escrito sirve sólo
  // para resaltar visualmente la coincidencia (ver `matchIndex` abajo).
  const filtered = options;

  // Índice de la primera opción cuyo texto contiene lo tipeado (case-insensitive).
  // Se usa para scroll-into-view al abrir el dropdown y para el resaltado
  // ligero, sin ocultar el resto.
  const matchIndex = useMemo(() => {
    const q = value.trim().toLocaleLowerCase();
    if (!q) return -1;
    return options.findIndex((o) => o.toLocaleLowerCase().includes(q));
  }, [options, value]);

  // Al abrir el popup, scrolleamos al match (si hay) para que quede a la vista
  // — especialmente útil con listados largos como "todas las gerencias".
  useEffect(() => {
    if (!open) return;
    const target = activeIndex ?? (matchIndex >= 0 ? matchIndex : 0);
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `li[data-index="${target}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, matchIndex]);

  const select = (opt: string) => {
    setValue(name, opt, { shouldDirty: true, shouldTouch: true });
    setOpen(false);
    setActiveIndex(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) =>
        i === null ? 0 : Math.min(i + 1, filtered.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length - 1);
        return;
      }
      setActiveIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
    } else if (
      e.key === 'Enter' &&
      open &&
      activeIndex !== null &&
      filtered[activeIndex]
    ) {
      e.preventDefault();
      select(filtered[activeIndex]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(null);
    }
  };

  const reg = register(name);

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={inputId}
        className="mb-1 block text-[13px] font-semibold text-ink"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          {...reg}
          onChange={(e) => {
            reg.onChange(e);
            setOpen(true);
            setActiveIndex(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            open && activeIndex !== null
              ? `${listId}-opt-${activeIndex}`
              : undefined
          }
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-sm border border-border-input bg-white py-1.5 pl-2 pr-8 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            // Evitamos que el caret robe foco: así al cerrar el popup el
            // input queda listo para seguir tipeando.
            e.preventDefault();
            setOpen((o) => !o);
          }}
          aria-label={`Abrir desplegable de ${label}`}
          className="absolute right-0 top-0 flex h-full w-8 items-center justify-center text-ink-muted transition-colors hover:text-ink"
        >
          <svg
            viewBox="0 0 10 6"
            className={`h-1.5 w-2.5 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-30 mt-1 max-h-[240px] overflow-auto rounded-sm border border-border bg-white py-1 shadow-md"
        >
          {filtered.map((opt, i) => {
            const isActive = activeIndex === i;
            const isSelected = value === opt;
            return (
              <li
                key={opt}
                id={`${listId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
                className={`cursor-pointer px-3 py-1.5 text-[13px] ${
                  isActive
                    ? 'bg-accent text-white'
                    : isSelected
                      ? 'bg-accent/10 font-semibold text-accent'
                      : 'text-ink hover:bg-section'
                }`}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
