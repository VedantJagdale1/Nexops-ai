import type { InputHTMLAttributes } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError | undefined;
  registration: UseFormRegisterReturn;
}

export function FormField({ label, error, registration, ...input }: FormFieldProps): JSX.Element {
  const inputId = input.id ?? registration.name;
  const errorId = `${inputId}-error`;
  return (
    <label htmlFor={inputId} className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        {...input}
        {...registration}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="focus:border-brand-500 focus:ring-brand-500/10 mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 dark:border-white/15 dark:bg-white/5"
      />
      {error ? (
        <span id={errorId} className="mt-1.5 block text-xs font-medium text-rose-600">
          {error.message}
        </span>
      ) : null}
    </label>
  );
}
