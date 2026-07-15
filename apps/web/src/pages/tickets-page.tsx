import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketSchema, roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, LifeBuoy, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { Modal } from '../components/modal';
import { listClients } from '../features/delivery/delivery-api';
import { createTicket, listTickets } from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

import type { z } from 'zod';

type TicketFormValue = z.infer<typeof createTicketSchema>;

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5';
const priorityTone = {
  low: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

export function TicketsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['tickets', search], queryFn: () => listTickets(search) });
  const clients = useQuery({
    queryKey: ['clients', 'ticket-form'],
    queryFn: () => listClients(),
    enabled: user?.role !== 'client' && modalOpen,
  });
  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: async () => {
      setModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  const form = useForm<TicketFormValue>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { category: 'other', priority: 'medium', subject: '', description: '' },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      form.reset();
    } catch (error) {
      form.setError('root', { message: getApiErrorMessage(error) });
    }
  });
  const items = query.data?.items ?? [];
  return (
    <main>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support tickets</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track client issues, ownership, response priority, and SLA commitments.
          </p>
        </div>
        {user && roleHasPermission(user.role, 'ticket:create') ? (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New ticket
          </button>
        ) : null}
      </header>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets…"
              className="focus:border-brand-400 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <span className="text-xs text-slate-500">{query.data?.meta.total ?? 0} tickets</span>
        </div>
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5"
              />
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
              <LifeBuoy className="text-brand-600 mx-auto size-10" />
              <h2 className="mt-4 font-semibold">No support requests found</h2>
              <p className="mt-2 text-sm text-slate-500">New client requests will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex flex-col gap-3 p-5 hover:bg-slate-50 sm:flex-row sm:items-center dark:hover:bg-white/[0.025]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5">
                  <CircleAlert className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ticket.subject}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone[ticket.priority]}`}
                  >
                    {ticket.priority}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    {ticket.status.replaceAll('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Modal open={modalOpen} title="Create support ticket" onClose={() => setModalOpen(false)}>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          {user?.role !== 'client' ? (
            <label className="block text-sm font-medium">
              Client
              <select className={fieldClass} {...form.register('clientId')}>
                <option value="">Select a client</option>
                {clients.data?.items.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Subject
            <input className={fieldClass} {...form.register('subject')} />
            {form.formState.errors.subject ? (
              <span className="mt-1 block text-xs text-rose-600">
                {form.formState.errors.subject.message}
              </span>
            ) : null}
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              rows={5}
              className="focus:border-brand-500 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
              {...form.register('description')}
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Category
              <select className={fieldClass} {...form.register('category')}>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature request</option>
                <option value="question">Question</option>
                <option value="access">Access</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Priority
              <select className={fieldClass} {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          {form.formState.errors.root?.message ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <button
            disabled={mutation.isPending}
            className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating ticket…' : 'Create ticket'}
          </button>
        </form>
      </Modal>
    </main>
  );
}
