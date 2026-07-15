import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';

import { ErrorPanel } from '../components/error-panel';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';

export function NotificationsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const items = query.data?.items ?? [];
  return (
    <main>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">
            Assignments, client activity, billing events, and delivery updates.
          </p>
        </div>
        {(query.data?.meta.unread ?? 0) > 0 ? (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        ) : null}
      </header>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
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
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <Bell className="text-brand-600 mx-auto size-10" />
              <h2 className="mt-4 font-semibold">You’re all caught up</h2>
              <p className="mt-2 text-sm text-slate-500">
                New workspace activity will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((item) => (
              <button
                key={item.id}
                disabled={item.isRead || markOne.isPending}
                onClick={() => markOne.mutate(item.id)}
                className={`flex w-full gap-4 p-5 text-left ${item.isRead ? '' : 'bg-brand-50/50 dark:bg-brand-950/10'} hover:bg-slate-50 dark:hover:bg-white/[0.025]`}
              >
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${item.isRead ? 'bg-slate-300' : 'bg-brand-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row">
                    <p className="font-semibold">{item.title}</p>
                    <time className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
