import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers3,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  TicketCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandMark } from '../components/brand-mark';

const capabilities = [
  {
    icon: Layers3,
    title: 'Delivery command center',
    copy: 'Projects, milestones, Kanban work, documents, and capacity in one view.',
  },
  {
    icon: MessagesSquare,
    title: 'Client collaboration',
    copy: 'Keep project conversations, decisions, files, and support history connected.',
  },
  {
    icon: CircleDollarSign,
    title: 'Commercial clarity',
    copy: 'Turn delivery into accurate invoices and a live view of outstanding revenue.',
  },
  {
    icon: Sparkles,
    title: 'Useful AI, on your terms',
    copy: 'Create structured status reports and task plans with a provider you control.',
  },
];

const activity = [
  {
    label: 'API contract review',
    project: 'Atlas Commerce',
    status: 'In review',
    accent: 'bg-amber-400',
  },
  {
    label: 'Checkout resilience',
    project: 'Atlas Commerce',
    status: 'In progress',
    accent: 'bg-sky-400',
  },
  {
    label: 'Mobile design QA',
    project: 'Northstar Health',
    status: 'Completed',
    accent: 'bg-brand-400',
  },
];

export function LandingPage(): JSX.Element {
  return (
    <div className="bg-canvas text-ink min-h-screen overflow-hidden dark:bg-slate-950 dark:text-white">
      <header className="relative z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"
          aria-label="Main navigation"
        >
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <BrandMark />
            <span>
              NexOps <span className="text-brand-600 dark:text-brand-400">AI</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#platform" className="transition hover:text-slate-950 dark:hover:text-white">
              Platform
            </a>
            <a href="#security" className="transition hover:text-slate-950 dark:hover:text-white">
              Security
            </a>
            <a href="#outcomes" className="transition hover:text-slate-950 dark:hover:text-white">
              Outcomes
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-ink dark:bg-brand-400 dark:hover:bg-brand-300 hidden rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:block dark:text-slate-950"
            >
              Start workspace
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-32 lg:pt-28">
          <div className="bg-brand-200/40 dark:bg-brand-900/20 pointer-events-none absolute -right-64 -top-60 size-[44rem] rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
              <Gauge className="size-3.5" /> Agency operations, connected
            </div>
            <h1 className="max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Client delivery,
              <br />
              <span className="text-brand-600 dark:text-brand-400">under control.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
              Run projects, support, conversations, billing, and reporting from one secure operating
              system built for modern service teams.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="bg-ink dark:bg-brand-400 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 dark:text-slate-950"
              >
                Create your workspace <ArrowRight className="size-4" />
              </Link>
              <a
                href="#platform"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-5 py-3.5 text-sm font-semibold transition hover:border-slate-400 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Explore the platform
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {['Tenant-isolated', 'Role-aware', 'AI optional'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="text-brand-500 size-4" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="bg-brand-300/25 dark:bg-brand-500/10 absolute -inset-4 rotate-2 rounded-[2rem] blur-2xl" />
            <div className="shadow-soft relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Wednesday, 16 July
                  </p>
                  <p className="mt-1 font-semibold">Good morning, Maya</p>
                </div>
                <div className="bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200 grid size-9 place-items-center rounded-full text-sm font-bold">
                  MS
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                {[
                  ['Active projects', '12', '+2 this month'],
                  ['Team utilisation', '84%', 'Healthy capacity'],
                  ['Open tickets', '7', '1 needs attention'],
                ].map(([label, value, note]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.035]"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                    <p className="text-brand-700 dark:text-brand-300 mt-1 text-[11px]">{note}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-5 px-5 pb-5 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Delivery velocity</p>
                      <p className="text-xs text-slate-400">Tasks completed · 8 weeks</p>
                    </div>
                    <span className="bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 rounded-lg px-2 py-1 text-xs font-semibold">
                      +18.4%
                    </span>
                  </div>
                  <div className="flex h-32 items-end gap-2" aria-label="Delivery velocity chart">
                    {[38, 48, 43, 65, 58, 72, 68, 88].map((height, index) => (
                      <div
                        key={height + index}
                        className="bg-brand-100 dark:bg-brand-900/60 flex-1 rounded-t-md"
                      >
                        <div
                          className="bg-brand-500 rounded-t-md"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
                  <p className="text-sm font-semibold">Focus queue</p>
                  <div className="mt-4 space-y-4">
                    {activity.map((item) => (
                      <div key={item.label} className="flex gap-3">
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${item.accent}`} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{item.label}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {item.project} · {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="platform"
          className="border-y border-slate-200 bg-white py-24 dark:border-white/10 dark:bg-slate-900/50"
        >
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-brand-600 dark:text-brand-400 text-sm font-semibold uppercase tracking-[0.16em]">
                One source of truth
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                The operating layer between your team and your clients.
              </h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 dark:border-white/10 dark:bg-white/10">
              {capabilities.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="bg-white p-8 dark:bg-slate-900">
                  <Icon className="text-brand-600 dark:text-brand-400 size-6" />
                  <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="security"
          className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:px-8"
        >
          <div>
            <ShieldCheck className="text-brand-600 size-8" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">
              Boundaries built into the architecture.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
              Every record, query, permission, and real-time room is scoped to an organisation.
              Security is part of the data path—not a UI convention.
            </p>
          </div>
          <div id="outcomes" className="grid gap-4 sm:grid-cols-2">
            {[
              ['Fewer status meetings', 'Give clients a live, permission-aware view of delivery.'],
              ['Faster ticket response', 'Connect ownership, SLA timing, and project context.'],
              ['Cleaner handoffs', 'Keep decisions and files beside the work they affect.'],
              ['Reliable reporting', 'Build weekly updates from current delivery data.'],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"
              >
                <Clock3 className="text-brand-500 size-5" />
                <p className="mt-5 font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-5 py-8 text-sm text-slate-500 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>NexOps AI</span>
          <span className="flex items-center gap-2">
            <TicketCheck className="size-4" /> Built for accountable delivery
          </span>
        </div>
      </footer>
    </div>
  );
}
