import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

type Ctx = {
  active: string;
  setActive: (v: string) => void;
  baseId: string;
  triggerRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  order: React.MutableRefObject<string[]>;
};

const TabsCtx = createContext<Ctx | null>(null);

function useTabsCtx(caller: string): Ctx {
  const ctx = useContext(TabsCtx);
  if (!ctx) {
    throw new Error(`<Tabs.${caller}> debe usarse dentro de <Tabs>.`);
  }
  return ctx;
}

type RootProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

function TabsRoot({ value, onValueChange, children, className = '' }: RootProps) {
  const baseId = useId();
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const order = useRef<string[]>([]);

  const ctx = useMemo<Ctx>(
    () => ({ active: value, setActive: onValueChange, baseId, triggerRefs, order }),
    [value, onValueChange, baseId]
  );

  return (
    <TabsCtx.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────
function TabsList({
  children,
  className = '',
  ariaLabel = 'Secciones del formulario',
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1 overflow-x-auto border-b-2 border-border-strong bg-section px-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Trigger ────────────────────────────────────────────────────────────────
function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useTabsCtx('Trigger');
  const isActive = ctx.active === value;

  // Registrar orden para flechas.
  if (!ctx.order.current.includes(value)) {
    ctx.order.current.push(value);
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ctx.order.current;
    const i = keys.indexOf(value);
    if (i === -1) return;
    let next: string | null = null;
    if (e.key === 'ArrowRight') next = keys[(i + 1) % keys.length];
    else if (e.key === 'ArrowLeft') next = keys[(i - 1 + keys.length) % keys.length];
    else if (e.key === 'Home') next = keys[0];
    else if (e.key === 'End') next = keys[keys.length - 1];
    if (next) {
      e.preventDefault();
      ctx.setActive(next);
      ctx.triggerRefs.current.get(next)?.focus();
    }
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      ref={(el) => {
        if (el) ctx.triggerRefs.current.set(value, el);
        else ctx.triggerRefs.current.delete(value);
      }}
      onClick={() => ctx.setActive(value)}
      onKeyDown={onKeyDown}
      className={`-mb-0.5 whitespace-nowrap border-b-[3px] px-4 py-2.5 text-[12px] font-medium tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        isActive
          ? 'border-accent text-accent'
          : 'border-transparent text-ink-muted hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────
function TabsPanel({
  value,
  children,
  /**
   * Si es true, el panel siempre está montado (solo se oculta con `hidden`).
   * Útil para que el estado del formulario en cada tab se mantenga vivo entre
   * cambios y RHF no pierda suscripciones.
   */
  keepMounted = true,
  className = '',
}: {
  value: string;
  children: ReactNode;
  keepMounted?: boolean;
  className?: string;
}) {
  const ctx = useTabsCtx('Panel');
  const isActive = ctx.active === value;
  if (!isActive && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      hidden={!isActive}
      className={className}
    >
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
