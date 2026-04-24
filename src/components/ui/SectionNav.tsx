type Section = { id: string; label: string };

type Props = {
  sections: Section[];
  /** ID actualmente en vista. Resaltado con underline accent. */
  active: string;
  /** Handler de click: recibe el ID y debe disparar el scroll. */
  onNavigate: (id: string) => void;
};

/**
 * Barra de navegación tipo tabs, pero funciona como anchor-links: al
 * clickear dispara `onNavigate(id)` (que el padre usa para scrollear).
 * La sección activa se calcula externamente (normalmente con
 * `useActiveSection`) y se resalta aquí.
 */
export function SectionNav({ sections, active, onNavigate }: Props) {
  return (
    <nav
      role="navigation"
      aria-label="Secciones del formulario"
      className="flex gap-1 overflow-x-auto px-4"
    >
      {sections.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onNavigate(s.id)}
            aria-current={isActive ? 'location' : undefined}
            className={`-mb-0.5 whitespace-nowrap border-b-[3px] px-4 py-2.5 text-[12px] font-medium tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
