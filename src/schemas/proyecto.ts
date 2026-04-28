import { z } from 'zod';
import { todayISO } from '../utils/formatters';

/**
 * Monto en miles de pesos (m$). El valor puede quedar vacío mientras el usuario
 * completa el formulario — preprocesamos "" → undefined para que Zod lo acepte.
 */
const moneyField = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().optional()
);

const numberField = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().optional()
);

const textField = z.string().optional().default('');
const longTextField = z.string().optional().default('');
const boolField = z.boolean().optional().default(false);

/**
 * Campo fecha con default "hoy" robusto:
 *  • Si está ausente → default.
 *  • Si es '' o null (borrador v2 viejo con fecha vacía) → preprocesa a
 *    undefined para que el default se dispare.
 *  • Si tiene un valor guardado (YYYY-MM-DD) → respeta ese valor.
 */
const fechaHoyField = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().optional().default(() => todayISO())
);

// ─── Encabezado ─────────────────────────────────────────────────────────────
const encabezadoSchema = z.object({
  fecha: fechaHoyField,
  direccion: textField,
  gerencia: textField,
  ot: textField,
});

/** Máximo de caracteres para Descripción y Objetivos de la Carátula. */
export const DESCRIPCION_MAX = 3000;

const longTextCappedField = z
  .string()
  .max(DESCRIPCION_MAX)
  .optional()
  .default('');

/**
 * Metadatos de un archivo adjunto. El blob (File) vive en memoria
 * (ver `hooks/useAttachments.ts`) — acá sólo persistimos nombre, tipo y
 * tamaño para que el borrador muestre la lista aunque el archivo real no
 * esté disponible tras recargar.
 */
const archivoMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
});

export type ArchivoMeta = z.infer<typeof archivoMetaSchema>;

// ─── A. Descripción general ─────────────────────────────────────────────────
const descripcionSchema = z.object({
  denominacion: textField,
  descripcion: longTextCappedField,
  descripcionIncluyeAnexo: boolField,
  descripcionAnexos: z.array(archivoMetaSchema).default([]),
  objetivos: longTextCappedField,
  objetivosIncluyeAnexo: boolField,
  objetivosAnexos: z.array(archivoMetaSchema).default([]),
  tipoErogacion: textField,
  modalidadEvaluacion: textField,
});

// ─── Características básicas ────────────────────────────────────────────────
const caracteristicasSchema = z.object({
  mesInicio: textField,
  mesFinErogacion: textField,
  mesFinProyecto: textField,
});

// ─── Resumen de montos ──────────────────────────────────────────────────────
const filaResumenSchema = z.object({
  ejActual: moneyField,
  ejSiguientes: moneyField,
  previsto: moneyField,
});

const resumenMontosSchema = z.object({
  ingresosAhorros: filaResumenSchema.default({}),
  egresosActivables: filaResumenSchema.default({}),
  otrosEgresosActivables: filaResumenSchema.default({}),
  gastosNoActivables: filaResumenSchema.default({}),
  gastosIncrementales: filaResumenSchema.default({}),
});

// ─── Detalle del monto total a invertir ─────────────────────────────────────
const conceptoMontoSchema = z.object({
  id: z.string(),
  concepto: textField,
  monto: moneyField,
});

const detalleInversionSchema = z.object({
  activable: z.object({
    hardware: moneyField,
    software: moneyField,
    otros: moneyField,
  }).default({}),
  noActivable: z.array(conceptoMontoSchema).default([]),
  gastosIncrementales: z.array(conceptoMontoSchema).default([]),
});

// ─── Información complementaria TI ──────────────────────────────────────────
const infoTISchema = z.object({
  hardware: z.object({
    equipos: moneyField,
    instalacion: moneyField,
    otros: moneyField,
  }).default({}),
  software: z.object({
    licencias: moneyField,
    apoyoExterno: moneyField,
    otros: moneyField,
  }).default({}),
});

// ─── B. Evaluación económica ────────────────────────────────────────────────
const evaluacionSchema = z.object({
  horizonteMeses: numberField,
  tir: numberField,
  tasaCorte: numberField,
  van: moneyField,
  periodoRepagoMeses: numberField,
});

// ─── Opiniones ──────────────────────────────────────────────────────────────
const opinionesSchema = z.object({
  planeamiento: longTextField,
  administracion: longTextField,
  areasApoyo: longTextField,
});

// ─── C. Autorizaciones ──────────────────────────────────────────────────────
// La firma + fecha se completan a mano tras imprimir, así que no guardamos
// nada del lado del form. El schema queda como objeto vacío por extensibilidad
// futura (y para que la migración de borradores v2 no rompa).
const autorizacionSchema = z.object({}).partial();

// Aprobadores de APEM — las 7 keys se mantienen alineadas con `AUTORIZACIONES`
// en `src/data/constants.ts`.
const autorizacionesSchema = z.object({
  gerenteProponente: autorizacionSchema.default({}),
  directorProponente: autorizacionSchema.default({}),
  subdirectorGralProponente: autorizacionSchema.default({}),
  directorPlaneamiento: autorizacionSchema.default({}),
  subdirectorGralInnovacion: autorizacionSchema.default({}),
  directorGeneral: autorizacionSchema.default({}),
  directorio: autorizacionSchema.default({}),
});

// ─── Carátula completa ──────────────────────────────────────────────────────
export const caratulaSchema = z.object({
  encabezado: encabezadoSchema.default({}),
  descripcion: descripcionSchema.default({}),
  caracteristicas: caracteristicasSchema.default({}),
  resumenMontos: resumenMontosSchema.default({}),
  /** Cotización de referencia del dólar (pesos por USD). */
  cotizacionUsd: moneyField,
  /**
   * Moneda en la que el usuario está cargando los valores. Los montos
   * siempre se persisten en m$; en modo "usd" los inputs convierten a m$ al
   * guardar y muestran el equivalente USD al usuario.
   */
  monedaEntrada: z.enum(['pesos', 'usd']).optional().default('pesos'),
  detalleInversion: detalleInversionSchema.default({}),
  infoTI: infoTISchema.default({}),
  evaluacion: evaluacionSchema.default({}),
  opiniones: opinionesSchema.default({}),
  autorizaciones: autorizacionesSchema.default({}),
});

// ═══════════════════════════════════════════════════════════════════════════
// Solapa 2 — Detalle Mensual
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Los 12 meses del año calendario. Las claves son las abreviaturas en español
 * para que el JSON en localStorage sea legible.
 */
export const MESES_KEYS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;
export type MesKey = (typeof MESES_KEYS)[number];

const mesesMontoSchema = z.object({
  ene: moneyField, feb: moneyField, mar: moneyField, abr: moneyField,
  may: moneyField, jun: moneyField, jul: moneyField, ago: moneyField,
  sep: moneyField, oct: moneyField, nov: moneyField, dic: moneyField,
});

/**
 * Una fila mensual del Detalle. Algunas filas tienen label fijo (Hardware,
 * Software, etc.) y otras son "Detallar" con label editable por el usuario.
 */
const filaDetalleSchema = z.object({
  label: textField,        // solo usado cuando la fila tiene label editable
  meses: mesesMontoSchema.default({}),
});

export const detalleMensualSchema = z.object({
  inversion: z.object({
    tecnologia: z.object({
      hardware: filaDetalleSchema.default({}),
      software: filaDetalleSchema.default({}),
      licencias: filaDetalleSchema.default({}),
      apoyoExterno: filaDetalleSchema.default({}),
      otros: filaDetalleSchema.default({}),
    }).default({}),
    bienesUso: z.object({
      fila1: filaDetalleSchema.default({}),
      fila2: filaDetalleSchema.default({}),
    }).default({}),
    obras: z.object({
      fila1: filaDetalleSchema.default({}),
      fila2: filaDetalleSchema.default({}),
    }).default({}),
  }).default({}),
  noActivable: z.object({
    capacitacion: filaDetalleSchema.default({}),
    movilidades: filaDetalleSchema.default({}),
    refacciones: filaDetalleSchema.default({}),
    otros: filaDetalleSchema.default({}),
  }).default({}),
  impacto: z.object({
    ingresosIncrementales: filaDetalleSchema.default({}),
    ahorroGastos: filaDetalleSchema.default({}),
    gastosCorrientes: filaDetalleSchema.default({}),
    amortizacion: filaDetalleSchema.default({}),
  }).default({}),
});

// ═══════════════════════════════════════════════════════════════════════════
// Solapa 3 — Anexos Activos
// ═══════════════════════════════════════════════════════════════════════════

const filaAnexoSchema = z.object({
  id: z.string(),
  concepto: textField,
  cantidad: numberField,
  costoUnitario: moneyField,       // en m$
  meses: mesesMontoSchema.default({}),
  anioMas1: moneyField,
  anioMas2: moneyField,
});

const subSeccionAnexoSchema = z.object({
  filas: z.array(filaAnexoSchema).default([]),
});

export const anexosActivosSchema = z.object({
  hardware: subSeccionAnexoSchema.default({}),
  software: subSeccionAnexoSchema.default({}),
  desarrollosExternos: subSeccionAnexoSchema.default({}),
  otrosTecnologicos: subSeccionAnexoSchema.default({}),
  bienesUso: subSeccionAnexoSchema.default({}),
  obras: subSeccionAnexoSchema.default({}),
});

// ═══════════════════════════════════════════════════════════════════════════
// Proyecto (root)
// ═══════════════════════════════════════════════════════════════════════════

export const proyectoSchema = z.object({
  meta: z
    .object({
      codigoFormulario: z.literal('AD-OO-0136/01-05').default('AD-OO-0136/01-05'),
      version: z.literal('Ene.22').default('Ene.22'),
      fechaCreacion: z.string().default(() => new Date().toISOString()),
      estado: z.enum(['borrador', 'presentado']).default('borrador'),
    })
    .default({}),
  caratula: caratulaSchema.default({}),
  detalleMensual: detalleMensualSchema.default({}),
  anexosActivos: anexosActivosSchema.default({}),
});

export type Proyecto = z.infer<typeof proyectoSchema>;
export type Caratula = z.infer<typeof caratulaSchema>;
export type DetalleMensual = z.infer<typeof detalleMensualSchema>;
export type AnexosActivos = z.infer<typeof anexosActivosSchema>;
export type FilaDetalle = z.infer<typeof filaDetalleSchema>;
export type FilaAnexo = z.infer<typeof filaAnexoSchema>;
export type MesesMonto = z.infer<typeof mesesMontoSchema>;
export type ConceptoMonto = z.infer<typeof conceptoMontoSchema>;
export type FilaResumen = z.infer<typeof filaResumenSchema>;

/**
 * Construye un Proyecto vacío con todos los defaults resueltos.
 *
 * Importante — clave para que el botón "Limpiar" funcione: Zod, al parsear
 * `{}`, **strippea las claves de los campos `optional()` sin `default()`**
 * (`numberField`, `moneyField`, etc.). Si esas claves no están presentes en
 * el objeto, RHF.reset() no recorre esos paths y los inputs quedan con su
 * valor anterior. Por eso pasamos un input "esqueleto" con todas las claves
 * declaradas explícitamente como `undefined` — Zod las preserva en el output
 * cuando vienen explícitas.
 */
export function crearProyectoVacio(): Proyecto {
  // Helpers para ahorrar verbosidad — todas las claves explícitamente undefined.
  const emptyMeses = (): Record<MesKey, undefined> => ({
    ene: undefined, feb: undefined, mar: undefined, abr: undefined,
    may: undefined, jun: undefined, jul: undefined, ago: undefined,
    sep: undefined, oct: undefined, nov: undefined, dic: undefined,
  });
  const emptyFilaResumen = () => ({
    ejActual: undefined,
    ejSiguientes: undefined,
    previsto: undefined,
  });
  const emptyFilaDetalle = () => ({ label: '', meses: emptyMeses() });

  return proyectoSchema.parse({
    caratula: {
      cotizacionUsd: undefined,
      resumenMontos: {
        ingresosAhorros: emptyFilaResumen(),
        egresosActivables: emptyFilaResumen(),
        otrosEgresosActivables: emptyFilaResumen(),
        gastosNoActivables: emptyFilaResumen(),
        gastosIncrementales: emptyFilaResumen(),
      },
      detalleInversion: {
        activable: { hardware: undefined, software: undefined, otros: undefined },
      },
      infoTI: {
        hardware: { equipos: undefined, instalacion: undefined, otros: undefined },
        software: { licencias: undefined, apoyoExterno: undefined, otros: undefined },
      },
      evaluacion: {
        horizonteMeses: undefined,
        tir: undefined,
        tasaCorte: undefined,
        van: undefined,
        periodoRepagoMeses: undefined,
      },
    },
    detalleMensual: {
      inversion: {
        tecnologia: {
          hardware: emptyFilaDetalle(),
          software: emptyFilaDetalle(),
          licencias: emptyFilaDetalle(),
          apoyoExterno: emptyFilaDetalle(),
          otros: emptyFilaDetalle(),
        },
        bienesUso: { fila1: emptyFilaDetalle(), fila2: emptyFilaDetalle() },
        obras: { fila1: emptyFilaDetalle(), fila2: emptyFilaDetalle() },
      },
      noActivable: {
        capacitacion: emptyFilaDetalle(),
        movilidades: emptyFilaDetalle(),
        refacciones: emptyFilaDetalle(),
        otros: emptyFilaDetalle(),
      },
      impacto: {
        ingresosIncrementales: emptyFilaDetalle(),
        ahorroGastos: emptyFilaDetalle(),
        gastosCorrientes: emptyFilaDetalle(),
        amortizacion: emptyFilaDetalle(),
      },
    },
  });
}

/**
 * Genera un ID estable para los items de listas dinámicas.
 */
function nuevoId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nuevoConceptoMonto(): ConceptoMonto {
  return { id: nuevoId('cm'), concepto: '', monto: undefined };
}

export function nuevoArchivoMeta(file: File): ArchivoMeta {
  return {
    id: nuevoId('att'),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
  };
}

export function nuevaFilaAnexo(): FilaAnexo {
  return {
    id: nuevoId('anx'),
    concepto: '',
    cantidad: undefined,
    costoUnitario: undefined,
    meses: {
      ene: undefined, feb: undefined, mar: undefined, abr: undefined,
      may: undefined, jun: undefined, jul: undefined, ago: undefined,
      sep: undefined, oct: undefined, nov: undefined, dic: undefined,
    },
    anioMas1: undefined,
    anioMas2: undefined,
  };
}

/** Etiquetas de meses en castellano (para UI y PDF). */
export const MESES_LABELS: Record<MesKey, string> = {
  ene: 'Ene', feb: 'Feb', mar: 'Mar', abr: 'Abr',
  may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Ago',
  sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dic',
};
