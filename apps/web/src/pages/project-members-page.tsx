import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { listTeam } from '../features/delivery/delivery-api';

import { useProject } from './project-context';
export function ProjectMembersPage(): JSX.Element {
  const project = useProject();
  const team = useQuery({ queryKey: ['team'], queryFn: listTeam });
  const members =
    team.data?.filter(
      (member) => project.memberIds.includes(member.id) || project.projectManagerId === member.id,
    ) ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <h2 className="font-semibold">Project team</h2>
      <p className="mt-1 text-sm text-slate-500">
        People authorised to collaborate on this project.
      </p>
      {team.isLoading ? (
        <div className="mt-5 h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
      ) : members.length === 0 ? (
        <div className="mt-5 grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-200 text-center dark:border-white/10">
          <div>
            <Users className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-semibold">No members assigned</p>
            <p className="mt-1 text-xs text-slate-500">
              Assign a project manager or delivery contributor from project settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-white/5"
            >
              <span className="bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200 grid size-10 place-items-center rounded-xl text-sm font-bold">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold">{member.name}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {project.projectManagerId === member.id
                    ? 'Project manager'
                    : member.role.replace('_', ' ')}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
