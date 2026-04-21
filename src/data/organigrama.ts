export interface Direccion {
  nombre: string;
  gerencias: string[];
}

export const ORGANIGRAMA: Direccion[] = [
  { nombre: 'Dirección General', gerencias: [] },
  { nombre: 'Dirección de Auditoría Interna', gerencias: [] },
  { nombre: 'Unidad de Cumplimiento, Integridad y Transparencia', gerencias: [] },
  {
    nombre: 'Dirección Ejecutiva',
    gerencias: [
      'Gerencia de Planificación Ejecutiva',
      'Gerencia de Abastecimiento',
      'Coordinación Ejecutiva',
      'Gerencia Región PBA / La Pampa / Metro',
      'Gerencia Región Centro / NEA',
      'Gerencia Región Cuyo / NOA',
      'Gerencia Región SUR',
    ],
  },
  {
    nombre: 'Dirección General de Administración',
    gerencias: [
      'Gerencia de Infraestructura',
      'Gerencia de Comercio Exterior',
      'Gerencia de Apoyo Técnico Administrativo',
      'Gerencia de Comunicación Corporativa y Asuntos Internacionales',
      'Gerencia de Ingeniería',
    ],
  },
  {
    nombre: 'Dirección de Innovación Corporativa y Transformación',
    gerencias: ['Gerencia de Negocios Inmobiliarios', 'Gerencia de Inteligencia Artificial'],
  },
  {
    nombre: 'Dirección de Operaciones',
    gerencias: [
      'Seguimiento Operativo y Control de Gestión',
      'Operaciones Nacionales',
      'Transporte',
      'Operaciones Internacionales',
    ],
  },
  {
    nombre: 'Dirección Comercial',
    gerencias: [
      'Administración de Ventas',
      'Gobierno',
      'Entidades Financieras y Servicios',
      'Empresas Industriales y Comerciales',
      'Comercial de Regiones',
      'Soporte Clientes Corporativos',
      'Marketing Operativo',
      'Marketing Digital',
      'Centro de Contacto',
      'Punto de Venta',
    ],
  },
  {
    nombre: 'Dirección de RRHH',
    gerencias: [
      'RRHH Metro',
      'RRHH Interior',
      'Relaciones Laborales',
      'Salud Ocupacional',
      'Gestión de Remuneraciones',
      'Juicios Laborales',
      'Desarrollo de RRHH',
      'Seguridad Ocupacional',
    ],
  },
  {
    nombre: 'Dirección de TI',
    gerencias: [
      'Administración TI (Jefatura)',
      'Sistemas',
      'Seguridad de la Información',
      'Tecnología Informática',
      'Analítica y Ciencia de Datos',
    ],
  },
  {
    nombre: 'Dirección de Servicios Electorales',
    gerencias: [
      'Aplicaciones Tecnológicas',
      'Logística Electoral',
      'Asistencia Técnica Legal',
      'Gerentes Regionales',
      'Coordinadores Regional',
      'Líderes de Proyecto',
    ],
  },
  {
    nombre: 'Dirección de Asuntos Legales',
    gerencias: [
      'Asuntos Corporativos',
      'Comercial Legal',
      'Asuntos Contenciosos',
      'Oficios Judiciales (Jefatura)',
    ],
  },
  {
    nombre: 'Dirección de Finanzas',
    gerencias: ['Impuestos (Jefatura)', 'Administración', 'Finanzas', 'Costos'],
  },
  {
    nombre: 'Dirección de Seguridad',
    gerencias: ['Unidad de Inspección General', 'Seguridad', 'Investigación y Protección Postal'],
  },
  {
    nombre: 'Dirección de Planeamiento Estratégico de Negocios',
    gerencias: ['Planeamiento Estratégico', 'Procesos y Normatización'],
  },
];

export const DIRECCIONES: readonly string[] = ORGANIGRAMA.map((d) => d.nombre);

export function gerenciasFor(direccion: string | undefined | null): string[] {
  if (!direccion) return [];
  return ORGANIGRAMA.find((d) => d.nombre === direccion)?.gerencias ?? [];
}

/**
 * Sub-gerencias de las cuatro Gerencias Regionales (referencia para V3).
 * No se exponen en el select encadenado de V1 (solo Dirección → Gerencia).
 */
export const SUB_GERENCIAS_REGIONALES: Record<string, string[]> = {
  'Gerencia Región PBA / La Pampa / Metro': [
    'Gerencia de RRHH Interior',
    'Gerencia de Administración',
    'Controlling',
    'Operaciones Metro (Jefatura)',
    'Operaciones PBA/La Pampa (Jefatura)',
    'Ventas (Jefatura)',
    'RR HH (Jefatura)',
    'Administración (Jefatura)',
  ],
  'Gerencia Región Centro / NEA': [
    'RR HH (Jefatura)',
    'Administración (Jefatura)',
    'Operaciones (Jefatura)',
    'Ventas (Jefatura)',
  ],
  'Gerencia Región Cuyo / NOA': [
    'RR HH (Jefatura)',
    'Administración (Jefatura)',
    'Operaciones (Jefatura)',
    'Ventas (Jefatura)',
  ],
  'Gerencia Región SUR': [
    'RR HH (Jefatura)',
    'Administración (Jefatura)',
    'Operaciones (Jefatura)',
    'Ventas (Jefatura)',
  ],
};
