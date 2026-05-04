import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { crearProyectoVacio, proyectoSchema, type Proyecto } from '../schemas/proyecto';

/**
 * Hook central del formulario. Centraliza `defaultValues` y `resolver` para
 * que el resto del código no tenga que saber nada de Zod ni React Hook Form.
 *
 * IMPORTANTE — `defaultValues` siempre arranca en `crearProyectoVacio()`
 * (todo `undefined`), y los `initialValues` (típicamente desde localStorage)
 * se inyectan vía `reset()` post-mount. Esto evita un bug clásico de RHF:
 * `useWatch` sustituye `undefined` por el `defaultValue`, lo que hace que
 * borrar un campo cargado desde storage "reviva" el valor anterior.
 *
 * En V2 (backend) este mismo flujo permite hacer fetch async y llamar
 * `reset(fetched)` cuando llegue la respuesta.
 */
export function useProyectoForm(
  initialValues?: Proyecto
): UseFormReturn<Proyecto> {
  const methods = useForm<Proyecto>({
    defaultValues: crearProyectoVacio(),
    resolver: zodResolver(proyectoSchema),
    mode: 'onBlur',
  });

  // Inyectamos los initialValues (si los hay) tras el mount para que NO
  // queden registrados como `defaultValues` — así borrar un campo limpia
  // de verdad y no vuelve al valor cargado.
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    if (initialValues) {
      methods.reset(initialValues, { keepDefaultValues: true });
    }
  }, [initialValues, methods]);

  return methods;
}
