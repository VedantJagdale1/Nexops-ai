import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandMark } from '../../components/brand-mark';

import type { PropsWithChildren } from 'react';

interface AuthLayoutProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthLayout({
  children,
  eyebrow,
  title,
  description,
}: AuthLayoutProps): JSX.Element {
  return (
    <main className="bg-canvas text-ink min-h-screen dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-3 font-semibold tracking-tight">
              <BrandMark /> NexOps <span className="text-brand-600 -ml-2">AI</span>
            </Link>
            <div className="mt-14">
              <p className="text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-[0.16em]">
                {eyebrow}
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
            <div className="mt-9">{children}</div>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="size-4" /> Back to overview
            </Link>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:items-center xl:p-20">
          <div className="bg-brand-500/20 absolute -right-28 -top-28 size-96 rounded-full blur-3xl" />
          <div className="absolute -bottom-36 left-20 size-96 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-xl">
            <div className="text-brand-200 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold">
              <ShieldCheck className="size-4" /> Secure by architecture
            </div>
            <blockquote className="mt-8 text-3xl font-medium leading-tight tracking-[-0.03em]">
              “Every client, project, conversation, and invoice stays inside the organisation
              boundary that owns it.”
            </blockquote>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {[
                'HTTP-only session renewal',
                'Tenant-scoped data access',
                'Central permission policies',
                'Traceable security events',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300"
                >
                  <CheckCircle2 className="text-brand-400 size-4 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
