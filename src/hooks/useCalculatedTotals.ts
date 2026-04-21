import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  MESES_KEYS,
  type AnexosActivos,
  type Caratula,
  type ConceptoMonto,
  type DetalleMensual,
  type FilaAnexo,
  type FilaDetalle,
  type FilaResumen,
  type MesKey,
  type Proyecto,
} from '../schemas/proyecto';
import { sum } from '../utils/formatters';

// ═══════════════════════════════════════════════════════════════════════════
// Totales de la Carátula
// ═══════════════════════════════════════════════════════════════════════════

export type Totales = {
  resumen: {
    ingresosAhorrosTotal: number;
    egresosActivablesTotal: number;
    otrosEgresosActivablesTotal: number;
    gastosNoActivablesTotal: number;
    gastosIncrementalesTotal: number;
    montoTotalEjActual: number;
    montoTotalEjSiguientes: number;
    montoTotalTotal: number;
    montoTotalPrevisto: number;
  };
  detalle: {
    totalActivable: number;
    totalNoActivable: number;
    totalInversion: number;
    totalGastosIncrementales: number;
  };
  ti: {
    totalHardware: number;
    totalSoftware: number;
    totalHwSw: number;
  };
};

const filaSum = (f: FilaResumen | undefined): number =>
  sum(f?.ejActual, f?.ejSiguientes);

const montoOf = (c: ConceptoMonto | undefined): number | undefined => c?.monto;

export function computeTotales(args: {
  resumenMontos?: Caratula['resumenMontos'];
  detalleInversion?: Caratula['detalleInversion'];
  infoTI?: Caratula['infoTI'];
}): Totales {
  const rm = args.resumenMontos;
  const ing = rm?.ingresosAhorros;
  const eact = rm?.egresosActivables;
  const otra = rm?.otrosEgresosActivables;
  const gna = rm?.gastosNoActivables;
  const gincr = rm?.gastosIncrementales;

  const montoTotalEjActual = sum(eact?.ejActual, otra?.ejActual, gna?.ejActual);
  const montoTotalEjSiguientes = sum(
    eact?.ejSiguientes,
    otra?.ejSiguientes,
    gna?.ejSiguientes
  );
  const montoTotalPrevisto = sum(eact?.previsto, otra?.previsto, gna?.previsto);
  const montoTotalTotal = montoTotalEjActual + montoTotalEjSiguientes;

  const act = args.detalleInversion?.activable;
  const totalActivable = sum(act?.hardware, act?.software, act?.otros);
  const totalNoActivable = (args.detalleInversion?.noActivable ?? []).reduce<number>(
    (acc, it) => acc + (montoOf(it) ?? 0),
    0
  );
  const totalInversion = totalActivable + totalNoActivable;
  const totalGastosIncrementales = (
    args.detalleInversion?.gastosIncrementales ?? []
  ).reduce<number>((acc, it) => acc + (montoOf(it) ?? 0), 0);

  const hw = args.infoTI?.hardware;
  const sw = args.infoTI?.software;
  const totalHardware = sum(hw?.equipos, hw?.instalacion, hw?.otros);
  const totalSoftware = sum(sw?.licencias, sw?.apoyoExterno, sw?.otros);
  const totalHwSw = totalHardware + totalSoftware;

  return {
    resumen: {
      ingresosAhorrosTotal: filaSum(ing),
      egresosActivablesTotal: filaSum(eact),
      otrosEgresosActivablesTotal: filaSum(otra),
      gastosNoActivablesTotal: filaSum(gna),
      gastosIncrementalesTotal: filaSum(gincr),
      montoTotalEjActual,
      montoTotalEjSiguientes,
      montoTotalTotal,
      montoTotalPrevisto,
    },
    detalle: {
      totalActivable,
      totalNoActivable,
      totalInversion,
      totalGastosIncrementales,
    },
    ti: {
      totalHardware,
      totalSoftware,
      totalHwSw,
    },
  };
}

export function useCalculatedTotals(): Totales {
  const { control } = useFormContext<Proyecto>();

  const resumenMontos = useWatch({ control, name: 'caratula.resumenMontos' });
  const detalleInversion = useWatch({ control, name: 'caratula.detalleInversion' });
  const infoTI = useWatch({ control, name: 'caratula.infoTI' });

  return useMemo<Totales>(
    () => computeTotales({ resumenMontos, detalleInversion, infoTI }),
    [resumenMontos, detalleInversion, infoTI]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Totales del Detalle Mensual
// ═══════════════════════════════════════════════════════════════════════════

export type PerColumn = {
  meses: Record<MesKey, number>;
  anual: number;
};

export type RowTotalKey =
  | 'hardware'
  | 'software'
  | 'licencias'
  | 'apoyoExterno'
  | 'otros'
  | 'bienesUso1'
  | 'bienesUso2'
  | 'obras1'
  | 'obras2'
  | 'capacitacion'
  | 'movilidades'
  | 'refacciones'
  | 'otrosNoActivable'
  | 'ingresosIncrementales'
  | 'ahorroGastos'
  | 'gastosCorrientes'
  | 'amortizacion';

export type DetalleTotales = {
  /** Total anual (columna "Total año") por fila individual. */
  rowTotals: Record<RowTotalKey, number>;
  totalA1: PerColumn;
  totalA2: PerColumn;
  totalInversion: PerColumn;
  /** b.3 es un espejo de Total a.2. */
  b3: PerColumn;
  totalImpacto: PerColumn;
};

function sumAllMeses(f: FilaDetalle | undefined): number {
  if (!f?.meses) return 0;
  let s = 0;
  for (const k of MESES_KEYS) s += f.meses[k] ?? 0;
  return s;
}

function sumColumnas(filas: (FilaDetalle | undefined)[]): PerColumn {
  const meses = {} as Record<MesKey, number>;
  let anual = 0;
  for (const m of MESES_KEYS) {
    let s = 0;
    for (const f of filas) s += f?.meses?.[m] ?? 0;
    meses[m] = s;
    anual += s;
  }
  return { meses, anual };
}

function combinarColumnas(
  ...parts: Array<{ per: PerColumn; sign: 1 | -1 }>
): PerColumn {
  const meses = {} as Record<MesKey, number>;
  let anual = 0;
  for (const m of MESES_KEYS) {
    let s = 0;
    for (const p of parts) s += p.sign * p.per.meses[m];
    meses[m] = s;
    anual += s;
  }
  return { meses, anual };
}

export function computeDetalleTotales(
  dm: DetalleMensual | undefined
): DetalleTotales {
  const inv = dm?.inversion;
  const hardware = inv?.tecnologia?.hardware;
  const software = inv?.tecnologia?.software;
  const licencias = inv?.tecnologia?.licencias;
  const apoyoExterno = inv?.tecnologia?.apoyoExterno;
  const otros = inv?.tecnologia?.otros;
  const bu1 = inv?.bienesUso?.fila1;
  const bu2 = inv?.bienesUso?.fila2;
  const ob1 = inv?.obras?.fila1;
  const ob2 = inv?.obras?.fila2;

  const capacitacion = dm?.noActivable?.capacitacion;
  const movilidades = dm?.noActivable?.movilidades;
  const refacciones = dm?.noActivable?.refacciones;
  const otrosNA = dm?.noActivable?.otros;

  const ingresosInc = dm?.impacto?.ingresosIncrementales;
  const ahorroGastos = dm?.impacto?.ahorroGastos;
  const gastosCorr = dm?.impacto?.gastosCorrientes;
  const amortiz = dm?.impacto?.amortizacion;

  const rowTotals: Record<RowTotalKey, number> = {
    hardware: sumAllMeses(hardware),
    software: sumAllMeses(software),
    licencias: sumAllMeses(licencias),
    apoyoExterno: sumAllMeses(apoyoExterno),
    otros: sumAllMeses(otros),
    bienesUso1: sumAllMeses(bu1),
    bienesUso2: sumAllMeses(bu2),
    obras1: sumAllMeses(ob1),
    obras2: sumAllMeses(ob2),
    capacitacion: sumAllMeses(capacitacion),
    movilidades: sumAllMeses(movilidades),
    refacciones: sumAllMeses(refacciones),
    otrosNoActivable: sumAllMeses(otrosNA),
    ingresosIncrementales: sumAllMeses(ingresosInc),
    ahorroGastos: sumAllMeses(ahorroGastos),
    gastosCorrientes: sumAllMeses(gastosCorr),
    amortizacion: sumAllMeses(amortiz),
  };

  const totalA1 = sumColumnas([
    hardware, software, licencias, apoyoExterno, otros,
    bu1, bu2, ob1, ob2,
  ]);
  const totalA2 = sumColumnas([capacitacion, movilidades, refacciones, otrosNA]);
  const totalInversion = combinarColumnas(
    { per: totalA1, sign: 1 },
    { per: totalA2, sign: 1 }
  );
  const b3 = totalA2; // mirror
  const b1 = sumColumnas([ingresosInc]);
  const b2 = sumColumnas([ahorroGastos]);
  const b4 = sumColumnas([gastosCorr]);
  const b5 = sumColumnas([amortiz]);
  const totalImpacto = combinarColumnas(
    { per: b1, sign: 1 },
    { per: b2, sign: 1 },
    { per: b3, sign: -1 },
    { per: b4, sign: -1 },
    { per: b5, sign: -1 }
  );

  return { rowTotals, totalA1, totalA2, totalInversion, b3, totalImpacto };
}

export function useDetalleTotales(): DetalleTotales {
  const { control } = useFormContext<Proyecto>();
  const dm = useWatch({ control, name: 'detalleMensual' });
  return useMemo(() => computeDetalleTotales(dm), [dm]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Totales de Anexos Activos
// ═══════════════════════════════════════════════════════════════════════════

export type AnexoSectionKey =
  | 'hardware'
  | 'software'
  | 'desarrollosExternos'
  | 'otrosTecnologicos'
  | 'bienesUso'
  | 'obras';

export type AnexoRowTotals = {
  /** Costo total = cantidad × cto. unit. */
  costoTotal: number;
  /** Suma de los 12 meses. */
  totalAnual: number;
};

export type AnexoColTotals = {
  costoTotal: number;
  meses: Record<MesKey, number>;
  totalAnual: number;
  anioMas1: number;
  anioMas2: number;
};

export type AnexoSectionTotals = {
  rowTotals: Record<string, AnexoRowTotals>;
  colTotals: AnexoColTotals;
};

export type AnexosTotales = {
  sections: Record<AnexoSectionKey, AnexoSectionTotals>;
  /** TOTAL ACTIVOS TECNOLÓGICOS = a1.1 + a1.2 + a1.3 + a1.4 (por columna). */
  totalTecnologicos: AnexoColTotals;
};

function emptyCol(): AnexoColTotals {
  const meses = {} as Record<MesKey, number>;
  for (const m of MESES_KEYS) meses[m] = 0;
  return { costoTotal: 0, meses, totalAnual: 0, anioMas1: 0, anioMas2: 0 };
}

function rowTotalsOf(f: FilaAnexo): AnexoRowTotals {
  const costoTotal = (f.cantidad ?? 0) * (f.costoUnitario ?? 0);
  let totalAnual = 0;
  for (const m of MESES_KEYS) totalAnual += f.meses?.[m] ?? 0;
  return { costoTotal, totalAnual };
}

function computeSectionTotals(
  filas: FilaAnexo[] | undefined
): AnexoSectionTotals {
  const rowTotals: Record<string, AnexoRowTotals> = {};
  const col = emptyCol();

  for (const f of filas ?? []) {
    const rt = rowTotalsOf(f);
    rowTotals[f.id] = rt;
    col.costoTotal += rt.costoTotal;
    col.totalAnual += rt.totalAnual;
    for (const m of MESES_KEYS) {
      col.meses[m] += f.meses?.[m] ?? 0;
    }
    col.anioMas1 += f.anioMas1 ?? 0;
    col.anioMas2 += f.anioMas2 ?? 0;
  }

  return { rowTotals, colTotals: col };
}

function sumCols(...parts: AnexoColTotals[]): AnexoColTotals {
  const result = emptyCol();
  for (const p of parts) {
    result.costoTotal += p.costoTotal;
    result.totalAnual += p.totalAnual;
    for (const m of MESES_KEYS) result.meses[m] += p.meses[m];
    result.anioMas1 += p.anioMas1;
    result.anioMas2 += p.anioMas2;
  }
  return result;
}

export function computeAnexosTotales(
  anx: AnexosActivos | undefined
): AnexosTotales {
  const sections: Record<AnexoSectionKey, AnexoSectionTotals> = {
    hardware: computeSectionTotals(anx?.hardware?.filas),
    software: computeSectionTotals(anx?.software?.filas),
    desarrollosExternos: computeSectionTotals(anx?.desarrollosExternos?.filas),
    otrosTecnologicos: computeSectionTotals(anx?.otrosTecnologicos?.filas),
    bienesUso: computeSectionTotals(anx?.bienesUso?.filas),
    obras: computeSectionTotals(anx?.obras?.filas),
  };
  const totalTecnologicos = sumCols(
    sections.hardware.colTotals,
    sections.software.colTotals,
    sections.desarrollosExternos.colTotals,
    sections.otrosTecnologicos.colTotals
  );
  return { sections, totalTecnologicos };
}

export function useAnexosTotales(): AnexosTotales {
  const { control } = useFormContext<Proyecto>();
  const anx = useWatch({ control, name: 'anexosActivos' });
  return useMemo(() => computeAnexosTotales(anx), [anx]);
}
