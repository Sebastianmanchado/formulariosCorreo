import { useFieldArray, useFormContext, type FieldPath } from 'react-hook-form';
import { nuevoConceptoMonto, type Proyecto } from '../../schemas/proyecto';
import { Input } from './Input';
import { MoneyInput } from './MoneyInput';

type ConceptoMontoArrayPath =
  | 'caratula.detalleInversion.noActivable'
  | 'caratula.detalleInversion.gastosIncrementales';

type Props = {
  name: ConceptoMontoArrayPath;
  conceptoPlaceholder?: string;
  addLabel?: string;
  emptyMessage?: string;
};

/**
 * Lista dinámica de { concepto: string; monto: number | undefined }.
 * Wrapper de react-hook-form useFieldArray para los dos arrays del schema.
 */
export function DynamicList({
  name,
  conceptoPlaceholder = 'Concepto',
  addLabel = '+ Agregar concepto',
  emptyMessage = 'Sin ítems — agregá uno para comenzar.',
}: Props) {
  const { control, register } = useFormContext<Proyecto>();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-2">
      {fields.length === 0 && (
        <div className="rounded-sm border border-dashed border-border bg-white/50 px-3 py-2 text-[12px] italic text-ink-muted">
          {emptyMessage}
        </div>
      )}

      {fields.map((f, i) => (
        <div
          key={f.id}
          className="grid grid-cols-[2fr_1fr_32px] items-center gap-2"
        >
          <Input
            {...register(
              `${name}.${i}.concepto` as FieldPath<Proyecto>
            )}
            placeholder={conceptoPlaceholder}
          />
          <MoneyInput
            control={control}
            name={`${name}.${i}.monto` as FieldPath<Proyecto>}
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Eliminar ítem"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-white text-ink-muted transition-colors hover:border-accent2 hover:text-accent2"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append(nuevoConceptoMonto())}
        className="no-print self-start rounded-sm border border-accent bg-accent px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-accent-dark"
      >
        {addLabel}
      </button>
    </div>
  );
}
