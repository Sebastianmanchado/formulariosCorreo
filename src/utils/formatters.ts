/**
 * Utilidades de formato / parseo numérico en es-AR.
 * Los montos del formulario son miles de pesos (m$).
 */

const AR_LOCALE = 'es-AR';

/**
 * Unidad interna de los montos: **millones de pesos**. El valor almacenado
 * `5` se interpreta como 5.000.000 de pesos.
 * Los USD son valores absolutos (USD totales, no miles).
 */

/** Máximo de decimales para pesos (no redondear resultados). */
const PESOS_MAX_FRACTION = 4;
/** Máximo de decimales para USD (típico en USD). */
const USD_MAX_FRACTION = 2;

/**
 * Formatea un monto en millones de pesos. Hasta 4 decimales.
 * Undefined / NaN / '' devuelven ''.
 */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return n.toLocaleString(AR_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: PESOS_MAX_FRACTION,
  });
}

/**
 * Formateo "display-only": si el valor es 0 o vacío muestra '0'.
 * Pensado para celdas de totales calculados.
 */
export function formatMoneyZero(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  if (n === 0) return '0';
  return formatMoney(n);
}

/**
 * Parseo tolerante de input de usuario.
 * Acepta: "1234", "1234.56", "1.234,56", "1234,56", "-500".
 */
export function parseMoney(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  // Detectar formato: si tiene coma y punto, asumimos es-AR ("1.234,56").
  // Si solo tiene coma, asumimos que la coma es el separador decimal.
  // Si solo tiene punto, respetamos el punto como decimal.
  let cleaned = trimmed;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }
  cleaned = cleaned.replace(/[^\d.\-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Convierte un monto en **millones de pesos** a USD totales usando una
 * cotización pesos-por-dólar.
 *   USD = (millones_pesos × 1.000.000) / cotización
 * Devuelve `null` si la cotización no es válida.
 */
export function toUsd(
  amountInMillions: number | null | undefined,
  cotizacionPesosPorUsd: number | null | undefined
): number | null {
  if (
    !cotizacionPesosPorUsd ||
    cotizacionPesosPorUsd === 0 ||
    !Number.isFinite(cotizacionPesosPorUsd)
  ) {
    return null;
  }
  const m = amountInMillions ?? 0;
  return (m * 1_000_000) / cotizacionPesosPorUsd;
}

/**
 * Igual que `toUsd` pero formatea el resultado para display en USD totales
 * con hasta 2 decimales (sin redondeo fuerte).
 */
export function formatUsdFromMiles(
  amountInMillions: number | null | undefined,
  cotizacionPesosPorUsd: number | null | undefined
): string {
  const v = toUsd(amountInMillions, cotizacionPesosPorUsd);
  if (v === null) return '—';
  return v.toLocaleString(AR_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: USD_MAX_FRACTION,
  });
}

/**
 * Suma tolerante: ignora undefined / null / NaN.
 */
export function sum(...values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) total += v;
  }
  return total;
}

/**
 * "12.5" → "12,5 %".
 */
export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return `${n.toLocaleString(AR_LOCALE, { maximumFractionDigits: 2 })} %`;
}

/**
 * "2025-04-20" → "20/04/2025".
 */
export function formatDateAR(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * "2025-04" → "abril 2025".
 */
export function formatMonth(ym: string | null | undefined): string {
  if (!ym) return '';
  const match = /^(\d{4})-(\d{2})/.exec(ym);
  if (!match) return ym;
  const y = match[1];
  const m = parseInt(match[2], 10) - 1;
  return `${MESES_ES[m] ?? match[2]} ${y}`;
}

/**
 * Fecha de hoy en ISO (YYYY-MM-DD), usando zona horaria local —
 * importante para que el `<input type="date">` y el tope `max` coincidan con
 * lo que ve el usuario (evita bugs en tz distintas a UTC).
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Slug para nombre de archivo PDF.
 */
export function slugify(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}
