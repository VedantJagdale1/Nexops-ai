import { zodResolver } from '@hookform/resolvers/zod';
import { clientInputSchema } from '@nexops/shared';
import { useForm } from 'react-hook-form';

import { getApiErrorMessage } from '../../lib/api-client';

import type { ClientInput } from '@nexops/shared';

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5';
export function ClientForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: ClientInput) => Promise<void>;
  submitting: boolean;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ClientInput>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: { status: 'active' },
  });
  const submit = handleSubmit(async (input) => {
    try {
      await onSubmit(input);
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" error={errors.companyName?.message}>
          <input className={fieldClass} {...register('companyName')} />
        </Field>
        <Field label="Industry" error={errors.industry?.message}>
          <input className={fieldClass} {...register('industry')} />
        </Field>
        <Field label="Contact name" error={errors.contactName?.message}>
          <input className={fieldClass} {...register('contactName')} />
        </Field>
        <Field label="Contact email" error={errors.contactEmail?.message}>
          <input type="email" className={fieldClass} {...register('contactEmail')} />
        </Field>
        <Field label="Contact phone" error={errors.contactPhone?.message}>
          <input className={fieldClass} {...register('contactPhone')} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select className={fieldClass} {...register('status')}>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Address" error={errors.address?.message}>
        <input className={fieldClass} {...register('address')} />
      </Field>
      <Field label="Internal notes" error={errors.notes?.message}>
        <textarea
          rows={4}
          className="focus:border-brand-500 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          {...register('notes')}
        />
      </Field>
      {errors.root?.message ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errors.root.message}
        </p>
      ) : null}
      <button
        disabled={submitting}
        className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Creating client…' : 'Create client'}
      </button>
    </form>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
