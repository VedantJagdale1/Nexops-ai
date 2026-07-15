import { CalendarDays, CircleDollarSign, Clock3, Tag } from 'lucide-react';

import { useProject } from './project-context';
export function ProjectOverviewPage(): JSX.Element {
  const project = useProject();
  const money =
    project.estimatedBudgetMinor === undefined
      ? 'Not set'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(project.estimatedBudgetMinor / 100);
  const dates = (value?: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Not set';
  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h2 className="font-semibold">Delivery overview</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">
          {project.description ??
            'The project team is defining scope, outcomes, and acceptance criteria.'}
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Metric icon={CalendarDays} label="Start date" value={dates(project.startDate)} />
          <Metric icon={Clock3} label="Due date" value={dates(project.dueDate)} />
          <Metric icon={CircleDollarSign} label="Estimated budget" value={money} />
          <Metric
            icon={Tag}
            label="Tags"
            value={project.tags.length ? project.tags.join(', ') : 'None'}
          />
        </div>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h2 className="font-semibold">Delivery health</h2>
        <div className="mt-6 grid place-items-center">
          <div
            className="grid size-36 place-items-center rounded-full"
            style={{ background: `conic-gradient(#20af90 ${project.progress}%, #e2e8f0 0)` }}
          >
            <div className="grid size-28 place-items-center rounded-full bg-white text-center dark:bg-slate-900">
              <div>
                <p className="text-3xl font-bold">{project.progress}%</p>
                <p className="text-xs text-slate-500">complete</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-7 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Actual cost</span>
            <span className="font-semibold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                project.actualCostMinor / 100,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Team members</span>
            <span className="font-semibold">{project.memberIds.length}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/[0.025]">
      <Icon className="text-brand-600 size-4" />
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
