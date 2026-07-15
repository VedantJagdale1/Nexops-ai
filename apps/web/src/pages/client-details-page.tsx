import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { getClient, listProjects } from '../features/delivery/delivery-api';
import { getApiErrorMessage } from '../lib/api-client';
export function ClientDetailsPage(): JSX.Element {
  const { clientId = '' } = useParams();
  const client = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
  });
  const projects = useQuery({
    queryKey: ['projects', 'client', clientId],
    queryFn: () => listProjects(),
  });
  if (client.isError)
    return (
      <ErrorPanel
        message={getApiErrorMessage(client.error)}
        onRetry={() => void client.refetch()}
      />
    );
  if (client.isLoading || !client.data)
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />;
  const item = client.data;
  const related = projects.data?.items.filter((project) => project.clientId === clientId) ?? [];
  return (
    <main>
      <div className="to-brand-50/60 dark:to-brand-950/20 rounded-2xl border border-slate-200 bg-gradient-to-br from-white p-7 shadow-sm dark:border-white/10 dark:from-slate-900">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200 grid size-16 place-items-center rounded-2xl text-xl font-bold">
            {item.companyName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {item.status}
            </span>
            <h1 className="mt-2 text-3xl font-bold">{item.companyName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {item.industry ?? 'Technology services client'}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Primary contact</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p className="flex items-center gap-3">
              <Building2 className="size-4 text-slate-400" />
              {item.contactName}
            </p>
            <a
              className="text-brand-700 dark:text-brand-300 flex items-center gap-3"
              href={`mailto:${item.contactEmail}`}
            >
              <Mail className="size-4" />
              {item.contactEmail}
            </a>
            {item.contactPhone ? (
              <p className="flex items-center gap-3">
                <Phone className="size-4 text-slate-400" />
                {item.contactPhone}
              </p>
            ) : null}
            {item.address ? (
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                {item.address}
              </p>
            ) : null}
          </div>
          {item.notes ? (
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Internal notes
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.notes}
              </p>
            </div>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Projects</h2>
          <p className="mt-1 text-xs text-slate-500">Delivery portfolio for this client</p>
          <div className="mt-5 space-y-3">
            {related.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
                No projects have been created for this client.
              </p>
            ) : (
              related.map((project) => (
                <Link
                  to={`/projects/${project.id}/overview`}
                  key={project.id}
                  className="hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-white/5"
                >
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.key} · {project.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className="text-brand-700 dark:text-brand-300 text-sm font-semibold">
                    {project.progress}%
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
