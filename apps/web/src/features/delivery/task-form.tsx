import { zodResolver } from '@hookform/resolvers/zod';
import { taskInputSchema } from '@nexops/shared';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { getApiErrorMessage } from '../../lib/api-client';

import { listTeam } from './delivery-api';

import type { TaskInput } from '@nexops/shared';
const inputClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5';
export function TaskForm({
  projectId,
  onSubmit,
  submitting,
}: {
  projectId: string;
  onSubmit: (input: TaskInput) => Promise<void>;
  submitting: boolean;
}): JSX.Element {
  const team = useQuery({ queryKey: ['team'], queryFn: listTeam });
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TaskInput>({
    resolver: zodResolver(taskInputSchema),
    defaultValues: {
      projectId,
      status: 'backlog',
      priority: 'medium',
      assigneeIds: [],
      labels: [],
      checklist: [],
    },
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
      <input type="hidden" {...register('projectId')} />
      <Field label="Task title" error={errors.title?.message}>
        <input autoFocus className={inputClass} {...register('title')} />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <textarea
          rows={4}
          className="focus:border-brand-500 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          {...register('description')}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" error={errors.status?.message}>
          <select className={inputClass} {...register('status')}>
            <option value="backlog">Backlog</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="in_review">In review</option>
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
        <Field label="Due date" error={errors.dueDate?.message}>
          <input
            type="date"
            className={inputClass}
            {...register('dueDate', { setValueAs: (value: string) => value || undefined })}
          />
        </Field>
        <Field label="Estimate (minutes)" error={errors.estimatedMinutes?.message}>
          <input
            type="number"
            min="0"
            className={inputClass}
            {...register('estimatedMinutes', {
              setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
            })}
          />
        </Field>
      </div>
      <Field label="Assignees" error={errors.assigneeIds?.message}>
        <select
          multiple
          className="focus:border-brand-500 mt-1.5 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          {...register('assigneeIds')}
        >
          {team.data
            ?.filter((member) => member.role !== 'client')
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role.replace('_', ' ')}
              </option>
            ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-slate-400">
          Use Ctrl/Cmd to select multiple people.
        </span>
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
        className="bg-brand-600 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Creating task…' : 'Create task'}
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
