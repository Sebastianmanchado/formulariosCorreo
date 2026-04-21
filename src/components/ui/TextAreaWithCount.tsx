import { useFormContext, useWatch, type FieldValues, type Path } from 'react-hook-form';
import { TextArea } from './TextArea';

type Props<T extends FieldValues> = {
  name: Path<T>;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  id?: string;
  className?: string;
};

/**
 * Textarea con contador de caracteres en la esquina inferior derecha.
 *  • Límite estricto vía `maxLength` del HTML (el navegador corta la entrada).
 *  • Contador se pone rojo a partir del 95% del tope.
 *  • Depende de FormContext — se usa dentro de un <FormProvider>.
 */
export function TextAreaWithCount<T extends FieldValues>({
  name,
  maxLength,
  rows = 3,
  placeholder,
  id,
  className = '',
}: Props<T>) {
  const { register, control } = useFormContext<T>();
  const value = useWatch({ control, name }) as string | undefined;
  const count = value?.length ?? 0;
  const nearLimit = count >= Math.floor(maxLength * 0.95);

  return (
    <div className={className}>
      <TextArea
        id={id}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        {...register(name)}
      />
      <div
        className={`mt-1 text-right font-mono text-[10px] tabular-nums ${
          nearLimit ? 'font-semibold text-accent2' : 'text-ink-muted'
        }`}
        aria-live="polite"
      >
        {count.toLocaleString('es-AR')} / {maxLength.toLocaleString('es-AR')}
      </div>
    </div>
  );
}
