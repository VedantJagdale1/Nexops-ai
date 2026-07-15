import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { getProject } from '../features/delivery/delivery-api';
import { getApiErrorMessage } from '../lib/api-client';

export function ProjectLayout(): JSX.Element {
  const { projectId = '' } = useParams();
  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
  if (query.isError)
    return (
      <ErrorPanel message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  if (query.isLoading || !query.data)
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />;
  const project = query.data;
  const tabs = [
    { to: 'overview', label: 'Overview', icon: LayoutDashboard },
    { to: 'tasks', label: 'Kanban', icon: ListChecks },
    { to: 'members', label: 'Members', icon: Users },
    { to: 'documents', label: 'Documents', icon: FileText },
    { to: 'chat', label: 'Chat', icon: MessageSquareText },
  ];
  return (
    <main>
      <header className="to-brand-950 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 p-6 text-white shadow-lg dark:border-white/10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <FolderKanban />
            </div>
            <div>
              <p className="text-brand-300 font-mono text-xs font-semibold">{project.key}</p>
              <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
              <p className="mt-1 text-sm capitalize text-slate-300">
                {project.status.replaceAll('_', ' ')} · {project.priority} priority
              </p>
            </div>
          </div>
          <div className="min-w-44">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="bg-brand-400 h-full rounded-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
        <nav className="mt-6 flex gap-1 overflow-x-auto border-t border-white/10 pt-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${isActive ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mt-5">
        <Outlet context={project} />
      </div>
    </main>
  );
}
