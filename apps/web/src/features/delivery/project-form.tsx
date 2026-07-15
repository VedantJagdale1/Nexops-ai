import { zodResolver } from '@hookform/resolvers/zod';
import { projectInputSchema } from '@nexops/shared';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { getApiErrorMessage } from '../../lib/api-client';

import { listClients, listTeam } from './delivery-api';

import type { ProjectInput } from '@nexops/shared';

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5';
export function ProjectForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: ProjectInput) => Promise<void>;
  submitting: boolean;
}): JSX.Element {
  const clients = useQuery({ queryKey: ['clients', 'project-form'], queryFn: () => listClients() });
  const team = useQuery({ queryKey: ['team'], queryFn: listTeam });
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: { status: 'planning', priority: 'medium', memberIds: [], tags: [] },
  });
  const submit = handleSubmit(async (input) => {
    try {
      await onSubmit(input);
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  });
  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client" error={errors.clientId?.message}>
          <select className={inputClass} {...register('clientId')}>
            <option value="">Select a client</option>
            {clients.data?.items.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project key" error={errors.key?.message}>
          <input placeholder="NEX" className={inputClass} {...register('key')} />
        </Field>
        <Field label="Project name" error={errors.name?.message}>
          <input className={inputClass} {...register('name')} />
        </Field>
        <Field label="Project manager" error={errors.projectManagerId?.message}>
          <select
            className={inputClass}
            {...register('projectManagerId', { setValueAs: (value: string) => value || undefined })}
          >
            <option value="">Unassigned</option>
            {team.data
              ?.filter((member) => ['owner', 'admin', 'project_manager'].includes(member.role))
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select className={inputClass} {...register('status')}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
        <Field label="Priority" error={errors.priority?.message}>
          <select className={inputClass} {...register('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Start date" error={errors.startDate?.message}>
          <input
            type="date"
            className={inputClass}
            {...register('startDate', { setValueAs: (value: string) => value || undefined })}
          />
        </Field>
        <Field label="Due date" error={errors.dueDate?.message}>
          <input
            type="date"
            className={inputClass}
            {...register('dueDate', { setValueAs: (value: string) => value || undefined })}
          />
        </Field>
      </div>
      <Field label="Description" error={errors.description?.message}>
        <textarea
          rows={4}
          className="focus:border-brand-500 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          {...register('description')}
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
        disabled={submitting || clients.isLoading}
        className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Creating project…' : 'Create project'}
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
