import { useEffect, useRef, type MutableRefObject } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  type FieldError,
  type FieldErrors,
  type Resolver,
  type ResolverResult,
  type UseFormReturn,
} from 'react-hook-form';
import {
  crearProyectoVacio,
  proyectoSchema,
  validarParaImpresion,
  type Proyecto,
} from '../schemas/proyecto';

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
 * `exigirPdf`: mientras esté en true (después de un intento de imprimir
 * incompleto), el resolver mantiene los errores de campos obligatorios hasta
 * que el valor sea válido. El borrador se sigue guardando igual.
 */
export function useProyectoForm(
  initialValues?: Proyecto,
  exigirPdf?: MutableRefObject<boolean>
): UseFormReturn<Proyecto> {
  const exigirRef = useRef(exigirPdf);
  exigirRef.current = exigirPdf;

  const resolver: Resolver<Proyecto> = async (values, context, options) => {
    const base = await zodResolver(proyectoSchema)(values, context, options);
    if (!exigirRef.current?.current) return base;
    const errors = aplicarErroresImpresion(base.errors, values as Proyecto);
    if (Object.keys(errors).length === 0) return base;
    return { values: {}, errors } as ResolverResult<Proyecto>;
  };

  const methods = useForm<Proyecto>({
    defaultValues: crearProyectoVacio(),
    resolver,
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

function aplicarErroresImpresion(
  errors: FieldErrors<Proyecto>,
  proyecto: Proyecto
): FieldErrors<Proyecto> {
  const next = { ...errors } as Record<string, unknown>;
  for (const issue of validarParaImpresion(proyecto)) {
    const parts = issue.path.split('.');
    let cursor = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const child = cursor[key];
      const copy =
        child && typeof child === 'object' ? { ...(child as Record<string, unknown>) } : {};
      cursor[key] = copy;
      cursor = copy;
    }
    const leaf: FieldError = { type: issue.kind, message: issue.message };
    cursor[parts[parts.length - 1]] = leaf;
  }
  return next as FieldErrors<Proyecto>;
}
