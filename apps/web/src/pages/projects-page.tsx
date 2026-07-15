import { roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FolderKanban, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { Modal } from '../components/modal';
import { createProject, listProjects } from '../features/delivery/delivery-api';
import { ProjectForm } from '../features/delivery/project-form';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

import type { ProjectInput } from '@nexops/shared';
const priorityTone = {
  low: 'text-slate-500',
  medium: 'text-blue-600',
  high: 'text-amber-600',
  critical: 'text-rose-600',
};
export function ProjectsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const cache = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ['projects', search], queryFn: () => listProjects(search) });
  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setModal(false);
      await cache.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const submit = async (input: ProjectInput) => {
    await mutation.mutateAsync(input);
  };
  const items = query.data?.items ?? [];
  return (
    <main>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">
            Plan delivery, coordinate teams, and monitor outcomes.
          </p>
        </div>
        {user && roleHasPermission(user.role, 'project:create') ? (
          <button
            onClick={() => setModal(true)}
            className="bg-brand-600 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New project
          </button>
        ) : null}
      </header>
      <div className="mt-7 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or key…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">
          {query.data?.meta.total ?? 0} projects
        </span>
      </div>
      {query.isLoading ? (
        <div className="mt-5 grid animate-pulse gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-white/5" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-5">
          <ErrorPanel
            message={getApiErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
          <div>
            <FolderKanban className="text-brand-500 mx-auto size-10" />
            <h2 className="mt-4 font-semibold">
              {search ? 'No projects found' : 'Your delivery portfolio starts here'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Create a project and connect it to an active client.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => (
            <Link
              to={`/projects/${project.id}/overview`}
              key={project.id}
              className="hover:border-brand-300 group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  {project.key}
                </span>
                <span
                  className={`text-xs font-semibold capitalize ${priorityTone[project.priority]}`}
                >
                  {project.priority}
                </span>
              </div>
              <h2 className="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-5 text-lg font-semibold">
                {project.name}
              </h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                {project.description ?? 'Delivery scope is being defined by the project team.'}
              </p>
              <div className="mt-6">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-slate-500">
                    {project.status.replaceAll('_', ' ')}
                  </span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div
                    className="bg-brand-500 h-full rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/5">
                <CalendarDays className="size-4" />
                {project.dueDate
                  ? `Due ${new Date(`${project.dueDate}T00:00:00`).toLocaleDateString()}`
                  : 'No deadline set'}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Modal open={modal} title="Create delivery project" onClose={() => setModal(false)}>
        <ProjectForm onSubmit={submit} submitting={mutation.isPending} />
      </Modal>
    </main>
  );
}
