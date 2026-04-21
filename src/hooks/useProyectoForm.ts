import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { crearProyectoVacio, proyectoSchema, type Proyecto } from '../schemas/proyecto';

/**
 * Hook central del formulario. Centraliza `defaultValues` y `resolver` para
 * que el resto del código no tenga que saber nada de Zod ni React Hook Form.
 *
 * En V2 (backend) este hook será el único punto a tocar: agregar un efecto
 * que haga fetch del proyecto inicial y llame a `reset(fetched)` en lugar de
 * `crearProyectoVacio()`.
 */
export function useProyectoForm(
  initialValues?: Proyecto
): UseFormReturn<Proyecto> {
  return useForm<Proyecto>({
    defaultValues: initialValues ?? crearProyectoVacio(),
    resolver: zodResolver(proyectoSchema),
    mode: 'onBlur',
  });
}
