/**
 * Opciones de selects del formulario.
 * Las `value` se persisten en el schema; los `label` se muestran en la UI y el PDF.
 */

export const TIPOS_EROGACION = [
  { value: 'tecnologia', label: 'Tecnología de Sistemas (hardware/software)' },
  { value: 'bienes_uso', label: 'Bienes de uso varios' },
  { value: 'obras_edificios', label: 'Obras en edificios propios' },
  { value: 'otro', label: 'Otro' },
] as const;

export const MODALIDADES_EVALUACION = [
  { value: 'evaluable', label: 'Evaluable económicamente' },
  { value: 'no_evaluable_obligatorio', label: 'No evaluable económicamente (obligatorio/normativo)' },
  { value: 'no_evaluable_mejora', label: 'No evaluable económicamente (mejora operativa)' },
] as const;

export type TipoErogacion = (typeof TIPOS_EROGACION)[number]['value'];
export type ModalidadEvaluacion = (typeof MODALIDADES_EVALUACION)[number]['value'];

/**
 * Aprobadores de APEM — secuencia oficial de firmas.
 * El orden importa: se imprime en el PDF en este mismo orden.
 */
export const AUTORIZACIONES = [
  { key: 'gerenteProponente', label: '1. Gerente Proponente' },
  { key: 'directorProponente', label: '2. Director Proponente' },
  { key: 'subdirectorGralProponente', label: '3. Sub Director General Proponente' },
  { key: 'directorPlaneamiento', label: '4. Director de Planeamiento Estratégico de Negocios' },
  { key: 'subdirectorGralInnovacion', label: '5. Sub Director General de Innovación y Transformación Corporativa' },
  { key: 'directorGeneral', label: '6. Director General' },
  { key: 'directorio', label: '7. Directorio' },
] as const;

export type AutorizacionKey = (typeof AUTORIZACIONES)[number]['key'];

export function labelForTipoErogacion(v: string | undefined | null): string {
  return TIPOS_EROGACION.find((o) => o.value === v)?.label ?? '';
}

export function labelForModalidad(v: string | undefined | null): string {
  return MODALIDADES_EVALUACION.find((o) => o.value === v)?.label ?? '';
}
