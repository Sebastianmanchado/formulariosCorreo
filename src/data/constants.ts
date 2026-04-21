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

export const AUTORIZACIONES = [
  { key: 'gerenciaProponente', label: 'Gerencia Proponente' },
  { key: 'direccionProponente', label: 'Dirección Proponente' },
  { key: 'subdireccionIT', label: 'Subdirección de IT' },
  { key: 'planeamientoEstrategico', label: 'Gerencia de Planeamiento Estratégico y Control de Gestión' },
  { key: 'direccionAdministracion', label: 'Dirección de Administración' },
  { key: 'direccionGeneral', label: 'Dirección General' },
] as const;

export type AutorizacionKey = (typeof AUTORIZACIONES)[number]['key'];

export function labelForTipoErogacion(v: string | undefined | null): string {
  return TIPOS_EROGACION.find((o) => o.value === v)?.label ?? '';
}

export function labelForModalidad(v: string | undefined | null): string {
  return MODALIDADES_EVALUACION.find((o) => o.value === v)?.label ?? '';
}
