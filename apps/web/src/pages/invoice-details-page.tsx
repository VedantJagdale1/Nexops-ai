import { roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Printer, Send, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { getInvoice, updateInvoiceStatus } from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

import type { InvoiceDto } from '@nexops/shared';

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountMinor / 100,
  );
}

export function InvoiceDetailsPage(): JSX.Element {
  const { invoiceId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId),
  });
  const mutation = useMutation({
    mutationFn: (status: InvoiceDto['status']) => updateInvoiceStatus(invoiceId, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
  });
  if (query.isLoading)
    return <div className="h-[38rem] animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />;
  if (query.isError || !query.data)
    return (
      <ErrorPanel message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  const invoice = query.data;
  const canManage = Boolean(user && roleHasPermission(user.role, 'invoice:manage'));
  const actions: Array<{ status: InvoiceDto['status']; label: string; icon: typeof Send }> =
    invoice.status === 'draft'
      ? [
          { status: 'sent', label: 'Issue invoice', icon: Send },
          { status: 'cancelled', label: 'Cancel', icon: XCircle },
        ]
      : invoice.status === 'sent' || invoice.status === 'overdue'
        ? [
            { status: 'paid', label: 'Mark paid', icon: CheckCircle2 },
            { status: 'cancelled', label: 'Cancel', icon: XCircle },
          ]
        : [];
  return (
    <main>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back to invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900"
          >
            <Printer className="size-4" /> Print
          </button>
          {canManage
            ? actions.map(({ status, label, icon: Icon }) => (
                <button
                  key={status}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(status)}
                  className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))
            : null}
        </div>
      </div>
      {mutation.isError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200 print:hidden"
        >
          {getApiErrorMessage(mutation.error)}
        </p>
      ) : null}
      <article className="mx-auto mt-5 max-w-5xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 dark:border-white/10 dark:bg-slate-900 print:mt-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row dark:border-white/10">
          <div>
            <p className="text-brand-600 text-sm font-bold uppercase tracking-[0.24em]">
              NexOps AI
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Invoice</h1>
            <p className="mt-2 font-mono text-sm text-slate-500">{invoice.invoiceNumber}</p>
          </div>
          <div className="sm:text-right">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide dark:bg-white/5">
              {invoice.status}
            </span>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between gap-8 sm:justify-end">
                <dt className="text-slate-500">Issued</dt>
                <dd className="font-medium">{invoice.issueDate}</dd>
              </div>
              <div className="flex justify-between gap-8 sm:justify-end">
                <dt className="text-slate-500">Due</dt>
                <dd className="font-medium">{invoice.dueDate}</dd>
              </div>
            </dl>
          </div>
        </header>
        <section className="py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Bill to</p>
          <p className="mt-2 font-semibold">Client account</p>
          <p className="mt-1 text-sm text-slate-500">Client reference {invoice.clientId}</p>
        </section>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10">
                <th className="py-3 pr-4">Description</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit price</th>
                <th className="py-3 pl-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((line) => (
                <tr key={line.id} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-5 pr-4 font-medium">{line.description}</td>
                  <td className="px-4 py-5 text-right text-slate-500">
                    {line.quantityMilli / 1000}
                  </td>
                  <td className="px-4 py-5 text-right text-slate-500">
                    {money(line.unitAmountMinor, invoice.currency)}
                  </td>
                  <td className="py-5 pl-4 text-right font-semibold">
                    {money(line.totalMinor, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="ml-auto mt-8 max-w-sm space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{money(invoice.subtotalMinor, invoice.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax</span>
            <span>{money(invoice.taxMinor, invoice.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>-{money(invoice.discountMinor, invoice.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold dark:border-white/10">
            <span>Total</span>
            <span>{money(invoice.totalMinor, invoice.currency)}</span>
          </div>
        </section>
        {invoice.notes ? (
          <section className="mt-10 rounded-xl bg-slate-50 p-5 text-sm dark:bg-white/[0.025]">
            <p className="font-semibold">Notes</p>
            <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
              {invoice.notes}
            </p>
          </section>
        ) : null}
      </article>
    </main>
  );
}
