import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { Caratula, ConceptoMonto, FilaResumen, Proyecto } from '../schemas/proyecto';
import { sum } from '../utils/formatters';

export type Totales = {
  resumen: {
    ingresosAhorrosTotal: number;
    egresosActivablesTotal: number;
    otrosEgresosActivablesTotal: number;
    gastosNoActivablesTotal: number;
    gastosIncrementalesTotal: number;
    /** Suma activable + no activable por columna. */
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

/**
 * Lógica pura de cálculo. Se usa desde el hook (para la UI) y desde el
 * PdfPreview (que rinde snapshots sin FormContext).
 */
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

/**
 * Deriva todos los totales del formulario en tiempo real.
 * Usa useWatch con subtrees específicos para minimizar re-renders.
 */
export function useCalculatedTotals(): Totales {
  const { control } = useFormContext<Proyecto>();

  const resumenMontos = useWatch({
    control,
    name: 'caratula.resumenMontos',
  });
  const detalleInversion = useWatch({
    control,
    name: 'caratula.detalleInversion',
  });
  const infoTI = useWatch({
    control,
    name: 'caratula.infoTI',
  });

  return useMemo<Totales>(
    () => computeTotales({ resumenMontos, detalleInversion, infoTI }),
    [resumenMontos, detalleInversion, infoTI]
  );
}
