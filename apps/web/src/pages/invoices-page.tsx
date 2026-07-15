import { zodResolver } from '@hookform/resolvers/zod';
import { createInvoiceSchema, roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { Modal } from '../components/modal';
import { listClients } from '../features/delivery/delivery-api';
import { createInvoice, listInvoices } from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

import type { z } from 'zod';

type InvoiceFormValue = z.infer<typeof createInvoiceSchema>;

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountMinor / 100,
  );
}

export function InvoicesPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['invoices', search], queryFn: () => listInvoices(search) });
  const clients = useQuery({
    queryKey: ['clients', 'invoice-form'],
    queryFn: () => listClients(),
    enabled: modalOpen,
  });
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);
  const form = useForm<InvoiceFormValue>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientId: '',
      issueDate: isoDate(new Date()),
      dueDate: isoDate(dueDate),
      currency: 'USD',
      taxMinor: 0,
      discountMinor: 0,
      lineItems: [{ description: '', quantityMilli: 1000, unitAmountMinor: 0 }],
    },
  });
  const lineItems = useFieldArray({ control: form.control, name: 'lineItems' });
  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async () => {
      setModalOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      form.setError('root', { message: getApiErrorMessage(error) });
    }
  });
  const items = query.data?.items ?? [];
  return (
    <main>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-2 text-sm text-slate-500">
            Issue accurate client invoices and track collection status.
          </p>
        </div>
        {user && roleHasPermission(user.role, 'invoice:manage') ? (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New invoice
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
              placeholder="Search invoice number…"
              className="focus:border-brand-400 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <span className="text-xs text-slate-500">{query.data?.meta.total ?? 0} invoices</span>
        </div>
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5"
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
              <FileText className="text-brand-600 mx-auto size-10" />
              <h2 className="mt-4 font-semibold">No invoices yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Create a draft when client work is ready to bill.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.025]">
                <tr>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Issued</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {items.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="hover:text-brand-600 font-semibold"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{invoice.issueDate}</td>
                    <td className="px-5 py-4 text-slate-500">{invoice.dueDate}</td>
                    <td className="px-5 py-4 font-semibold">
                      {money(invoice.totalMinor, invoice.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize dark:bg-white/5">
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal open={modalOpen} title="Create invoice draft" onClose={() => setModalOpen(false)}>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
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
            <label className="block text-sm font-medium">
              Currency
              <input className={fieldClass} maxLength={3} {...form.register('currency')} />
            </label>
            <label className="block text-sm font-medium">
              Issue date
              <input type="date" className={fieldClass} {...form.register('issueDate')} />
            </label>
            <label className="block text-sm font-medium">
              Due date
              <input type="date" className={fieldClass} {...form.register('dueDate')} />
            </label>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line items</h3>
              <button
                type="button"
                onClick={() =>
                  lineItems.append({ description: '', quantityMilli: 1000, unitAmountMinor: 0 })
                }
                className="text-brand-600 text-sm font-semibold"
              >
                Add line
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {lineItems.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_7rem_9rem_auto] dark:border-white/10"
                >
                  <input
                    aria-label={`Line ${index + 1} description`}
                    placeholder="Description"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                    {...form.register(`lineItems.${index}.description`)}
                  />
                  <input
                    aria-label={`Line ${index + 1} quantity`}
                    type="number"
                    step="0.001"
                    min="0.001"
                    defaultValue="1"
                    onChange={(event) =>
                      form.setValue(
                        `lineItems.${index}.quantityMilli`,
                        Math.round(Number(event.target.value) * 1000),
                      )
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                  />
                  <input
                    aria-label={`Line ${index + 1} unit price`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit price"
                    onChange={(event) =>
                      form.setValue(
                        `lineItems.${index}.unitAmountMinor`,
                        Math.round(Number(event.target.value) * 100),
                      )
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                  />
                  <button
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lineItems.fields.length === 1}
                    onClick={() => lineItems.remove(index)}
                    className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Tax (minor units)
              <input
                type="number"
                min="0"
                className={fieldClass}
                {...form.register('taxMinor', { valueAsNumber: true })}
              />
            </label>
            <label className="block text-sm font-medium">
              Discount (minor units)
              <input
                type="number"
                min="0"
                className={fieldClass}
                {...form.register('discountMinor', { valueAsNumber: true })}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Notes
            <textarea
              rows={3}
              className="focus:border-brand-500 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
              {...form.register('notes')}
            />
          </label>
          {form.formState.errors.root?.message ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          {Object.keys(form.formState.errors).length > 0 && !form.formState.errors.root ? (
            <p role="alert" className="text-sm text-rose-600">
              Review the highlighted invoice fields and try again.
            </p>
          ) : null}
          <button
            disabled={mutation.isPending}
            className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating draft…' : 'Create invoice draft'}
          </button>
        </form>
      </Modal>
    </main>
  );
}
