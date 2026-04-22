import { useEffect, useId, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { DIRECCIONES, gerenciasFor } from '../../data/organigrama';
import type { Proyecto } from '../../schemas/proyecto';
import { Input } from './Input';

/**
 * Dos combos encadenados: Dirección → Gerencia.
 *
 * Son `<input list="...">` + `<datalist>` — así el usuario puede:
 *   • abrir el desplegable y elegir una opción del organigrama, o
 *   • escribir un valor libre que no esté en la lista.
 *
 * Al cambiar a una **Dirección conocida** (que está en el organigrama), se
 * resetea la Gerencia solo si la Gerencia actual no pertenece a esa nueva
 * lista. Si la Dirección es un valor libre (no está en el organigrama) no se
 * toca la Gerencia — así las ediciones tipográficas no borran la Gerencia
 * ya cargada.
 */
export function OrganigramaSelect() {
  const { register, setValue, control, getValues } = useFormContext<Proyecto>();
  const baseId = useId();
  const direccionListId = `${baseId}-direcciones`;
  const gerenciaListId = `${baseId}-gerencias`;

  const direccion = useWatch({
    control,
    name: 'caratula.encabezado.direccion',
  });
  const gerencias = useMemo(() => gerenciasFor(direccion), [direccion]);

  const prevDireccion = useRef(direccion);
  useEffect(() => {
    if (prevDireccion.current === direccion) return;
    prevDireccion.current = direccion;

    const currentGerencia = getValues('caratula.encabezado.gerencia');
    const isKnownDireccion = DIRECCIONES.includes(direccion ?? '');
    if (
      isKnownDireccion &&
      gerencias.length > 0 &&
      currentGerencia &&
      !gerencias.includes(currentGerencia)
    ) {
      setValue('caratula.encabezado.gerencia', '', { shouldDirty: true });
    }
  }, [direccion, gerencias, getValues, setValue]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-ink">
          Dirección
        </label>
        <Input
          {...register('caratula.encabezado.direccion')}
          list={direccionListId}
          placeholder="— seleccionar o escribir —"
          autoComplete="off"
        />
        <datalist id={direccionListId}>
          {DIRECCIONES.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-ink">
          Gerencia
        </label>
        <Input
          {...register('caratula.encabezado.gerencia')}
          list={gerenciaListId}
          placeholder="— seleccionar o escribir —"
          autoComplete="off"
        />
        <datalist id={gerenciaListId}>
          {gerencias.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
