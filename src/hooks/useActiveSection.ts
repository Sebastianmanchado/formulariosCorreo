import { useEffect, useState } from 'react';

/**
 * Detecta qué sección (de una lista de IDs) está más visible en el viewport.
 * Usa IntersectionObserver con una banda de detección a ~30%–35% del tope
 * del viewport — esto hace que el "active" cambie justo cuando la sección
 * cruza el tercio superior, no al entrar/salir del viewport completo.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');
  // Usar join como dependencia estable sin importar referencia del array.
  const key = ids.join('|');

  useEffect(() => {
    if (ids.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -65% 0px', threshold: 0 }
    );

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
