import { AlertTriangle, RotateCcw } from 'lucide-react';

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">We couldn’t load this view</p>
          <p className="mt-1 text-sm opacity-80">{message}</p>
          {onRetry ? (
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold hover:bg-rose-200 dark:bg-rose-900/60"
              onClick={onRetry}
            >
              <RotateCcw className="size-4" /> Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
