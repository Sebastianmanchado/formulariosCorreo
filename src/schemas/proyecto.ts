import { z } from 'zod';

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

// ─── Encabezado ─────────────────────────────────────────────────────────────
const encabezadoSchema = z.object({
  fecha: textField,           // ISO: YYYY-MM-DD
  direccion: textField,
  gerencia: textField,
  ot: textField,
});

// ─── A. Descripción general ─────────────────────────────────────────────────
const descripcionSchema = z.object({
  denominacion: textField,
  descripcion: longTextField,
  descripcionIncluyeAnexo: boolField,
  objetivos: longTextField,
  objetivosIncluyeAnexo: boolField,
  tipoErogacion: textField,         // value de TIPOS_EROGACION
  modalidadEvaluacion: textField,   // value de MODALIDADES_EVALUACION
});

// ─── Características básicas ────────────────────────────────────────────────
const caracteristicasSchema = z.object({
  mesInicio: textField,          // YYYY-MM
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
  tir: numberField,            // % anual
  tasaCorte: numberField,      // %
  van: moneyField,
  periodoRepagoMeses: numberField,
});

// ─── Opiniones ──────────────────────────────────────────────────────────────
const opinionesSchema = z.object({
  planeamiento: longTextField,
  administracion: longTextField,
  areasApoyo: longTextField,
});

// ─── C. Autorizaciones (la firma va en papel; solo guardamos la fecha) ──────
const autorizacionSchema = z.object({
  fecha: textField,
});

const autorizacionesSchema = z.object({
  gerenciaProponente: autorizacionSchema.default({}),
  direccionProponente: autorizacionSchema.default({}),
  subdireccionIT: autorizacionSchema.default({}),
  planeamientoEstrategico: autorizacionSchema.default({}),
  direccionAdministracion: autorizacionSchema.default({}),
  direccionGeneral: autorizacionSchema.default({}),
});

// ─── Carátula completa ──────────────────────────────────────────────────────
export const caratulaSchema = z.object({
  encabezado: encabezadoSchema.default({}),
  descripcion: descripcionSchema.default({}),
  caracteristicas: caracteristicasSchema.default({}),
  resumenMontos: resumenMontosSchema.default({}),
  detalleInversion: detalleInversionSchema.default({}),
  infoTI: infoTISchema.default({}),
  evaluacion: evaluacionSchema.default({}),
  opiniones: opinionesSchema.default({}),
  autorizaciones: autorizacionesSchema.default({}),
});

// ─── Proyecto (root) ────────────────────────────────────────────────────────
// meta + caratula. En V3 se sumarán `detalleMensual` y `anexosActivos` como
// sub-objetos opcionales sin tocar lo existente.
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
  // detalleMensual: detalleMensualSchema.optional(), // V3
  // anexosActivos: anexosActivosSchema.optional(),   // V3
});

export type Proyecto = z.infer<typeof proyectoSchema>;
export type Caratula = z.infer<typeof caratulaSchema>;
export type ConceptoMonto = z.infer<typeof conceptoMontoSchema>;
export type FilaResumen = z.infer<typeof filaResumenSchema>;

/**
 * Construye un Proyecto vacío con todos los defaults resueltos.
 * Se usa como `defaultValues` de React Hook Form.
 */
export function crearProyectoVacio(): Proyecto {
  return proyectoSchema.parse({});
}

/**
 * Genera un ID estable para los items de listas dinámicas.
 */
export function nuevoConceptoMonto(): ConceptoMonto {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `cm-${Math.random().toString(36).slice(2, 10)}`,
    concepto: '',
    monto: undefined,
  };
}
