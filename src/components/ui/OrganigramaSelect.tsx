import { useFormContext, useWatch } from 'react-hook-form';
import {
  SUBDIRECCIONES,
  direccionesDe,
  modoGerencia,
} from '../../data/organigrama';
import type { Proyecto } from '../../schemas/proyecto';
import { Field } from './Field';
import { Select } from './Select';

/**
 * Tres selects cerrados: Subdirección → Dirección → Gerencia.
 * Sin subdirección, los otros dos quedan deshabilitados.
 * Con dirección vacía, Gerencia ofrece las gerencias directas.
 * Una dirección sin gerencias deshabilita Gerencia.
 */
export function OrganigramaSelect() {
  const { register, setValue, control } = useFormContext<Proyecto>();
  const subdireccion = useWatch({ control, name: 'caratula.encabezado.subdireccion' }) ?? '';
  const direccion = useWatch({ control, name: 'caratula.encabezado.direccion' }) ?? '';

  const direcciones = direccionesDe(subdireccion);
  const modo = modoGerencia(subdireccion, direccion);
  const gerenciaDeshabilitada = modo.kind === 'disabled' || modo.kind === 'sin-gerencia';

  const subField = register('caratula.encabezado.subdireccion');
  const dirField = register('caratula.encabezado.direccion');
  const gerField = register('caratula.encabezado.gerencia');

  return (
    <>
      <Field label="Subdirección" bold orientation="column" className="min-w-0">
        <Select
          {...subField}
          className="max-w-full"
          onChange={(event) => {
            void subField.onChange(event);
            setValue('caratula.encabezado.direccion', '', { shouldDirty: true });
            setValue('caratula.encabezado.gerencia', '', { shouldDirty: true });
          }}
        >
          <option value="">— seleccionar —</option>
          {SUBDIRECCIONES.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dirección" bold orientation="column" className="min-w-0">
        <Select
          {...dirField}
          className="max-w-full"
          disabled={!subdireccion}
          onChange={(event) => {
            void dirField.onChange(event);
            setValue('caratula.encabezado.gerencia', '', { shouldDirty: true });
          }}
        >
          <option value="">{subdireccion ? '— sin dirección —' : '— seleccionar —'}</option>
          {direcciones.map((dir) => (
            <option key={dir.nombre} value={dir.nombre}>
              {dir.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Gerencia" bold orientation="column" className="min-w-0">
        <Select {...gerField} className="max-w-full" disabled={gerenciaDeshabilitada}>
          {modo.kind === 'sin-gerencia' ? (
            <option value="">Sin gerencia asociada</option>
          ) : (
            <>
              <option value="">— seleccionar —</option>
              {modo.options.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </>
          )}
        </Select>
      </Field>
    </>
  );
}
