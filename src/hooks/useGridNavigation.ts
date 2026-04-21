import { useEffect, type RefObject } from 'react';

/**
 * Navegación tipo Excel entre inputs de una tabla.
 *
 * Las celdas participantes deben tener `data-grid-row` y `data-grid-col`
 * (números). Celdas de solo lectura (totales calculados) simplemente no
 * llevan esas dataset keys — la navegación las saltea automáticamente
 * caminando en la dirección de la tecla hasta encontrar una celda válida.
 *
 * Comportamiento:
 *   • ↑ / ↓   — mueve entre filas (siempre navega, incluso con texto dentro).
 *   • ← / →   — solo navega si el cursor está al borde del input (en type=text).
 *               En inputs numéricos siempre navega (preventDefault evita
 *               el step nativo).
 *   • Enter   — baja una fila; Shift+Enter sube.
 */
export function useGridNavigation(
  containerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      const row = toInt(target.dataset.gridRow);
      const col = toInt(target.dataset.gridCol);
      if (row === null || col === null) return;

      let dr = 0;
      let dc = 0;

      if (e.key === 'ArrowUp') {
        dr = -1;
      } else if (e.key === 'ArrowDown') {
        dr = 1;
      } else if (e.key === 'ArrowLeft') {
        if (target.type !== 'number') {
          const pos = target.selectionStart;
          if (pos !== 0 && pos !== null) return;
        }
        dc = -1;
      } else if (e.key === 'ArrowRight') {
        if (target.type !== 'number') {
          const pos = target.selectionEnd;
          if (pos !== null && pos !== target.value.length) return;
        }
        dc = 1;
      } else if (e.key === 'Enter') {
        dr = e.shiftKey ? -1 : 1;
      } else {
        return;
      }

      const next = findCell(el, row + dr, col + dc, dr, dc);
      if (next) {
        e.preventDefault();
        next.focus();
        try {
          next.select();
        } catch {
          // algunos tipos de input (date, color) no permiten select()
        }
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [containerRef]);
}

function toInt(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Busca el próximo input navegable en la dirección (dr, dc) empezando desde
 * (startR, startC). Camina hasta encontrar o agotarse — así saltea celdas
 * calculadas intercaladas sin necesidad de conocerlas de antemano.
 */
function findCell(
  container: HTMLElement,
  startR: number,
  startC: number,
  dr: number,
  dc: number
): HTMLInputElement | null {
  if (dr === 0 && dc === 0) return null;

  const MAX_STEPS = 60;
  let r = startR;
  let c = startC;

  for (let i = 0; i < MAX_STEPS; i++) {
    const query = `input[data-grid-row="${r}"][data-grid-col="${c}"]`;
    const found = container.querySelector<HTMLInputElement>(query);
    if (found && !found.disabled && !found.readOnly) return found;
    r += dr;
    c += dc;
  }
  return null;
}
