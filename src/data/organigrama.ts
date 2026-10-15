export interface DireccionNodo {
  nombre: string;
  /** Vacío: la dirección no tiene gerencias (regionales, Comunicación Corporativa). */
  gerencias: readonly string[];
}

export interface SubdireccionNodo {
  nombre: string;
  gerenciasDirectas: readonly string[];
  direcciones: readonly DireccionNodo[];
}

export const ORGANIGRAMA: readonly SubdireccionNodo[] = [
  {
    nombre: 'Dirección Ejecutiva',
    gerenciasDirectas: [
      'Planificación Ejecutiva',
      'Coordinación Ejecutiva',
      'Abastecimiento',
      'Control de Demanda',
      'Gestión de Red y Experiencia del Cliente',
    ],
    direcciones: [
      {
        nombre: 'Servicios Electorales',
        gerencias: [
          'Servicios Especiales',
          'Aplicaciones Tecnológicas',
          'Logística Electoral',
          'Asistencia Técnica Legal',
        ],
      },
      {
        nombre: 'Operaciones',
        gerencias: [
          'Seguimiento Operativo y Control de Gestión',
          'Operaciones Nacionales',
          'Centros Logísticos',
          'Transporte',
          'Operaciones Internacionales',
        ],
      },
      {
        nombre: 'Comercial',
        gerencias: [
          'Comercial Regiones',
          'Empresas Industriales y Comerciales',
          'Entidades Financieras y Servicios',
          'Soporte Clientes Corporativos',
          'Gobierno',
          'Marketing Digital',
          'Marketing Operativo',
        ],
      },
      {
        nombre: 'RRHH',
        gerencias: [
          'RRHH Metro',
          'RRHH Interior',
          'Relaciones Laborales',
          'Medicina y Seguridad Ocupacional',
          'Gestión de Remuneraciones',
          'Juicios Laborales',
          'Desarrollo de RRHH',
        ],
      },
      {
        nombre: 'TI',
        gerencias: ['Sistemas', 'Seguridad de la Información', 'Tecnología Informática'],
      },
      {
        nombre: 'Ingeniería',
        gerencias: ['Ingeniería Operativa', 'Diseño y Optimización Logística'],
      },
      { nombre: 'Gerencia Regional PBA, LP y Metro', gerencias: [] },
      { nombre: 'Gerencia Regional NOA', gerencias: [] },
      { nombre: 'Gerencia Regional NEA', gerencias: [] },
      { nombre: 'Gerencia Regional Sur', gerencias: [] },
    ],
  },
  {
    nombre: 'Dirección General de Administración',
    gerenciasDirectas: [
      'Comercio Exterior',
      'Infraestructura',
      'Procesos Internacionales y Soporte Técnico Administrativo',
    ],
    direcciones: [
      { nombre: 'Comunicación Corporativa y Asuntos Internacionales', gerencias: [] },
      {
        nombre: 'Asuntos Legales',
        gerencias: ['Asuntos Corporativos', 'Comercial Legal', 'Asuntos Contenciosos'],
      },
      {
        nombre: 'Finanzas',
        gerencias: ['Administración', 'Finanzas', 'Costos y Cuentas a Pagar'],
      },
      {
        nombre: 'Seguridad',
        gerencias: [
          'Unidad de Inspección General',
          'Seguridad',
          'Investigación y Protección Postal',
        ],
      },
      {
        nombre: 'Gestión de Activos Estratégicos',
        gerencias: ['Inmuebles', 'Calidad'],
      },
    ],
  },
  {
    nombre: 'Dirección de Innovación Corporativa y Transformación',
    gerenciasDirectas: ['Gestión de Proyectos', 'Inteligencia Artificial'],
    direcciones: [
      {
        nombre: 'Planeamiento Estratégico de Negocios',
        gerencias: ['Planeamiento Estratégico', 'Procesos y Normatización'],
      },
    ],
  },
];

export const SUBDIRECCIONES: readonly string[] = ORGANIGRAMA.map((s) => s.nombre);

export function subdireccionDe(
  nombre: string | undefined | null
): SubdireccionNodo | undefined {
  if (!nombre) return undefined;
  return ORGANIGRAMA.find((s) => s.nombre === nombre);
}

export function direccionesDe(subdireccion: string | undefined | null): readonly DireccionNodo[] {
  return subdireccionDe(subdireccion)?.direcciones ?? [];
}

export type ModoGerencia =
  | { kind: 'disabled'; options: readonly string[] }
  | { kind: 'directas'; options: readonly string[] }
  | { kind: 'de-direccion'; options: readonly string[] }
  | { kind: 'sin-gerencia'; options: readonly string[] };

/**
 * Qué muestra el select de Gerencia:
 *  • sin subdirección → deshabilitado
 *  • subdirección y dirección vacía → gerencias directas
 *  • dirección con gerencias → esas gerencias
 *  • dirección sin gerencias → deshabilitado (“Sin gerencia asociada”)
 */
export function modoGerencia(
  subdireccion: string | undefined | null,
  direccion: string | undefined | null
): ModoGerencia {
  const nodo = subdireccionDe(subdireccion);
  if (!nodo) return { kind: 'disabled', options: [] };
  if (!direccion) return { kind: 'directas', options: nodo.gerenciasDirectas };
  const dir = nodo.direcciones.find((d) => d.nombre === direccion);
  if (!dir) return { kind: 'directas', options: nodo.gerenciasDirectas };
  if (dir.gerencias.length === 0) return { kind: 'sin-gerencia', options: [] };
  return { kind: 'de-direccion', options: dir.gerencias };
}

/**
 * Deja solo la combinación subdirección / dirección / gerencia que existe en
 * el organigrama. Lo que no coincide se vacía (borradores viejos).
 */
export function normalizarEncabezado(
  subdireccion: string,
  direccion: string,
  gerencia: string
): { subdireccion: string; direccion: string; gerencia: string } {
  const nodo = subdireccionDe(subdireccion);
  if (!nodo) return { subdireccion: '', direccion: '', gerencia: '' };

  if (!direccion) {
    const gerOk = gerencia === '' || nodo.gerenciasDirectas.includes(gerencia);
    return { subdireccion, direccion: '', gerencia: gerOk ? gerencia : '' };
  }

  const dir = nodo.direcciones.find((d) => d.nombre === direccion);
  if (!dir) return { subdireccion, direccion: '', gerencia: '' };
  if (dir.gerencias.length === 0) return { subdireccion, direccion, gerencia: '' };
  const gerOk = gerencia === '' || dir.gerencias.includes(gerencia);
  return { subdireccion, direccion, gerencia: gerOk ? gerencia : '' };
}
