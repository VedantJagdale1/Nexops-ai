import { roleHasPermission } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, File, FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
} from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

function fileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDocumentsPage(): JSX.Element {
  const { projectId = '' } = useParams();
  const [category, setCategory] = useState('general');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => listDocuments(projectId),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadDocument(projectId, category, file),
    onSuccess: async () => {
      if (inputRef.current) inputRef.current.value = '';
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    },
    onError: (uploadError) => setError(getApiErrorMessage(uploadError)),
  });
  const remove = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });
  const canUpload = Boolean(user && roleHasPermission(user.role, 'document:upload'));
  const items = query.data?.items ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Project documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            Secure files are downloaded through authorised API requests.
          </p>
        </div>
        {canUpload ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
            >
              <option value="general">General</option>
              <option value="requirements">Requirements</option>
              <option value="design">Design</option>
              <option value="contract">Contract</option>
              <option value="report">Report</option>
            </select>
            <label className="bg-brand-600 hover:bg-brand-700 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
              <FileUp className="size-4" /> {upload.isPending ? 'Uploading…' : 'Upload file'}
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                disabled={upload.isPending}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload.mutate(file);
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {query.isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <ErrorPanel
            message={getApiErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-200 text-center dark:border-white/10">
          <div>
            <File className="mx-auto size-9 text-slate-400" />
            <h3 className="mt-3 font-semibold">No project files</h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload requirements, designs, or delivery reports.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((document) => (
            <article
              key={document.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5">
                <File className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{document.name}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {document.category} · {fileSize(document.size)}
                </p>
              </div>
              <button
                aria-label={`Download ${document.name}`}
                onClick={() =>
                  void downloadDocument(document).catch((downloadError: unknown) =>
                    setError(getApiErrorMessage(downloadError)),
                  )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <Download className="size-4" />
              </button>
              {canUpload ? (
                <button
                  aria-label={`Delete ${document.name}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(document.id)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
