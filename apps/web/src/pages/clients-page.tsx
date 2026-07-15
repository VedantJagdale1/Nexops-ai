import { roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, Plus, Search, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { Modal } from '../components/modal';
import { ClientForm } from '../features/delivery/client-form';
import { createClient, listClients } from '../features/delivery/delivery-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

import type { ClientInput } from '@nexops/shared';

const statusTone = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  prospect: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
};
export function ClientsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ['clients', search], queryFn: () => listClients(search) });
  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: async () => {
      setModal(false);
      await client.invalidateQueries({ queryKey: ['clients'] });
    },
  });
  const submit = async (input: ClientInput) => {
    await mutation.mutateAsync(input);
  };
  const items = query.data?.items ?? [];
  return (
    <main>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-2 text-sm text-slate-500">
            Companies, stakeholders, and delivery relationships.
          </p>
        </div>
        {user && roleHasPermission(user.role, 'client:create') ? (
          <button
            onClick={() => setModal(true)}
            className="bg-brand-600 hover:bg-brand-700 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New client
          </button>
        ) : null}
      </header>
      <div className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients…"
              className="focus:border-brand-400 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <p className="text-xs text-slate-500">{query.data?.meta.total ?? 0} client records</p>
        </div>
        {query.isLoading ? (
          <div className="animate-pulse space-y-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-16 rounded-xl bg-slate-100 dark:bg-white/5" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-5">
            <ErrorPanel
              message={getApiErrorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <div className="bg-brand-50 text-brand-700 dark:bg-brand-950/40 mx-auto grid size-12 place-items-center rounded-2xl">
                <Building2 />
              </div>
              <h2 className="mt-4 font-semibold">
                {search ? 'No clients match your search' : 'Build your client portfolio'}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                {search
                  ? 'Try a company, contact, or email.'
                  : 'Add the first client company to begin planning delivery work.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.025]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Company</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Industry</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {items.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <Link
                        className="group-hover:text-brand-700 dark:group-hover:text-brand-300 flex items-center gap-3 font-semibold"
                        to={`/clients/${item.id}`}
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                          {item.companyName.slice(0, 2).toUpperCase()}
                        </span>
                        {item.companyName}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p>{item.contactName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="size-3" />
                        {item.contactEmail}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{item.industry ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <UsersRound className="size-4" />
        Contact information is visible only within your organisation.
      </div>
      <Modal open={modal} title="Add client company" onClose={() => setModal(false)}>
        <ClientForm onSubmit={submit} submitting={mutation.isPending} />
      </Modal>
    </main>
  );
}
