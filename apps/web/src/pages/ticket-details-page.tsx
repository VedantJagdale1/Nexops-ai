import { roleHasPermission, ticketStatuses } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock3, MessageSquareText, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import {
  addTicketMessage,
  getTicket,
  listTicketMessages,
  updateTicket,
} from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

export function TicketDetailsPage(): JSX.Element {
  const { ticketId = '' } = useParams();
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const ticket = useQuery({ queryKey: ['ticket', ticketId], queryFn: () => getTicket(ticketId) });
  const messages = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => listTicketMessages(ticketId),
  });
  const statusMutation = useMutation({
    mutationFn: (status: (typeof ticketStatuses)[number]) => updateTicket(ticketId, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
      ]);
    },
  });
  const messageMutation = useMutation({
    mutationFn: () => addTicketMessage(ticketId, { content: message, internal }),
    onSuccess: async () => {
      setMessage('');
      setInternal(false);
      await queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
    },
  });
  if (ticket.isLoading)
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />;
  if (ticket.isError || !ticket.data)
    return (
      <ErrorPanel
        message={getApiErrorMessage(ticket.error)}
        onRetry={() => void ticket.refetch()}
      />
    );
  const canManage = Boolean(user && roleHasPermission(user.role, 'ticket:manage'));
  const canReply = Boolean(user && roleHasPermission(user.role, 'ticket:create'));
  return (
    <main>
      <Link
        to="/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back to tickets
      </Link>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Support request
              </p>
              <h1 className="mt-2 text-2xl font-bold">{ticket.data.subject}</h1>
            </div>
            <span className="h-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize dark:bg-white/5">
              {ticket.data.priority} priority
            </span>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
            {ticket.data.description}
          </p>
          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageSquareText className="size-5" /> Conversation
            </h2>
            {messages.isError ? (
              <div className="mt-4">
                <ErrorPanel
                  message={getApiErrorMessage(messages.error)}
                  onRetry={() => void messages.refetch()}
                />
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              {messages.data?.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.025]">
                  No replies yet. Start the conversation below.
                </p>
              ) : null}
              {messages.data?.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${item.internal ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.025]'}`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-semibold">
                      {item.senderId === user?.id ? 'You' : 'Team member'}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
                  {item.internal ? (
                    <span className="mt-2 inline-block text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Internal note
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
            {canReply ? (
              <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <label className="text-sm font-medium">
                  Add reply
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    className="focus:border-brand-500 mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
                  />
                </label>
                <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  {user?.role !== 'client' ? (
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={internal}
                        onChange={(event) => setInternal(event.target.checked)}
                      />{' '}
                      Internal note
                    </label>
                  ) : (
                    <span />
                  )}
                  <button
                    disabled={!message.trim() || messageMutation.isPending}
                    onClick={() => messageMutation.mutate()}
                    className="bg-brand-600 hover:bg-brand-700 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="size-4" /> Send reply
                  </button>
                </div>
                {messageMutation.isError ? (
                  <p role="alert" className="mt-3 text-sm text-rose-600">
                    {getApiErrorMessage(messageMutation.error)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="font-semibold">Ticket status</h2>
            {canManage ? (
              <select
                value={ticket.data.status}
                onChange={(event) =>
                  statusMutation.mutate(event.target.value as (typeof ticketStatuses)[number])
                }
                className="focus:border-brand-500 mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm capitalize outline-none dark:border-white/10 dark:bg-white/5"
              >
                {ticketStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-3 text-sm capitalize text-slate-600 dark:text-slate-300">
                {ticket.data.status.replaceAll('_', ' ')}
              </p>
            )}
            {statusMutation.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                {getApiErrorMessage(statusMutation.error)}
              </p>
            ) : null}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock3 className="size-4" /> SLA details
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Deadline</dt>
                <dd className="mt-1 font-medium">
                  {ticket.data.slaDeadline
                    ? new Date(ticket.data.slaDeadline).toLocaleString()
                    : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="mt-1 font-medium capitalize">
                  {ticket.data.category.replaceAll('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-1 font-medium">
                  {new Date(ticket.data.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
