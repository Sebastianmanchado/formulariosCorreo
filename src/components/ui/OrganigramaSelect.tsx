import { useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { DIRECCIONES, gerenciasFor } from '../../data/organigrama';
import type { Proyecto } from '../../schemas/proyecto';
import { Select } from './Select';

/**
 * Dos selects encadenados: Dirección → Gerencia.
 * Gerencia queda deshabilitada hasta que se elige una Dirección con gerencias
 * asociadas. Si se cambia la Dirección, la Gerencia se resetea a vacío.
 */
export function OrganigramaSelect() {
  const { register, setValue, control } = useFormContext<Proyecto>();

  const direccion = useWatch({ control, name: 'caratula.encabezado.direccion' });
  const gerencias = useMemo(() => gerenciasFor(direccion), [direccion]);

  const prevDireccion = useRef(direccion);
  useEffect(() => {
    if (prevDireccion.current !== direccion) {
      setValue('caratula.encabezado.gerencia', '', { shouldDirty: true });
      prevDireccion.current = direccion;
    }
  }, [direccion, setValue]);

  const gerenciaDisabled = !direccion || gerencias.length === 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-ink">
          Dirección
        </label>
        <Select {...register('caratula.encabezado.direccion')}>
          <option value="">— seleccionar —</option>
          {DIRECCIONES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-ink">
          Gerencia
        </label>
        <Select
          {...register('caratula.encabezado.gerencia')}
          disabled={gerenciaDisabled}
        >
          <option value="">
            {gerenciaDisabled
              ? direccion
                ? 'Sin gerencias asociadas'
                : '— seleccioná una Dirección primero —'
              : '— seleccionar —'}
          </option>
          {gerencias.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
