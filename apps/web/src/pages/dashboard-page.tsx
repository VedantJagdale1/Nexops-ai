import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Gauge,
  Headphones,
  ListChecks,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorPanel } from '../components/error-panel';
import { getDashboard } from '../features/delivery/delivery-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

const chartColors = ['#20af90', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (minor: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(minor / 100);

function Skeleton(): JSX.Element {
  return (
    <div aria-label="Loading dashboard" className="animate-pulse space-y-6">
      <div className="h-20 rounded-2xl bg-slate-200 dark:bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-slate-200 dark:bg-white/5" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-white/5" />
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function DashboardPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (query.isLoading) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorPanel message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  if (!query.data) return <Skeleton />;
  const dashboard = query.data;
  const stats = [
    {
      label: 'Active projects',
      value: dashboard.stats.activeProjects,
      icon: BriefcaseBusiness,
      tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Overdue tasks',
      value: dashboard.stats.overdueTasks,
      icon: AlertCircle,
      tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
    },
    {
      label: 'Open tickets',
      value: dashboard.stats.openTickets,
      icon: Headphones,
      tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Pending invoices',
      value: dashboard.stats.pendingInvoices,
      icon: ListChecks,
      tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
    },
    {
      label: 'Monthly revenue',
      value: money(dashboard.stats.monthlyRevenueMinor),
      icon: CircleDollarSign,
      tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Team utilisation',
      value: `${dashboard.stats.teamUtilisation}%`,
      icon: Gauge,
      tone: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40',
    },
  ];
  return (
    <main>
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-brand-700 dark:text-brand-300 text-sm font-semibold">
            Delivery command centre
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Good to see you, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Live operational signals from your workspace.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <span className="mr-2 inline-block size-2 rounded-full bg-emerald-500" />
          Updated from organisation data
        </div>
      </header>
      <section
        aria-label="Operational metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
      >
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article
            key={label}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
          >
            <div className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-5" />
            </div>
            <p className="mt-5 text-2xl font-bold tracking-tight">{value}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <ArrowUpRight className="group-hover:text-brand-500 size-3.5 text-slate-300" />
            </div>
          </article>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Project portfolio</h2>
          <p className="mt-1 text-xs text-slate-500">Distribution by current delivery status</p>
          <div className="mt-5 h-64">
            {dashboard.projectsByStatus.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard.projectsByStatus}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={62}
                    outerRadius={94}
                    paddingAngle={3}
                  >
                    {dashboard.projectsByStatus.map((entry, index) => (
                      <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [String(value), titleCase(String(name))]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {dashboard.projectsByStatus.map((entry, index) => (
              <span key={entry.status} className="flex items-center gap-2 text-xs text-slate-500">
                <i
                  className="size-2 rounded-full"
                  style={{ background: chartColors[index % chartColors.length] }}
                />
                {titleCase(entry.status)} · {entry.count}
              </span>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Task flow</h2>
          <p className="mt-1 text-xs text-slate-500">Work items across Kanban stages</p>
          <div className="mt-5 h-72">
            {dashboard.tasksByStatus.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.tasksByStatus} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#94a3b833" />
                  <XAxis
                    dataKey="status"
                    tickFormatter={titleCase}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip labelFormatter={titleCase} />
                  <Bar dataKey="count" fill="#20af90" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Revenue trend</h2>
          <p className="mt-1 text-xs text-slate-500">Paid invoices over the last six months</p>
          <div className="mt-5 h-64">
            {dashboard.revenueTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.revenueTrend} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#20af90" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#20af90" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#94a3b833" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value: number) => money(value)}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="amountMinor"
                    stroke="#20af90"
                    fill="url(#revenue)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-semibold">Team workload</h2>
          <p className="mt-1 text-xs text-slate-500">Open assignments by contributor</p>
          <div className="mt-5 h-64">
            {dashboard.teamWorkload.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.teamWorkload} layout="vertical" margin={{ left: 15 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke="#94a3b833" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="openTasks" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function EmptyChart(): JSX.Element {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <div>
        <p className="text-sm font-semibold">No activity yet</p>
        <p className="mt-1 text-xs text-slate-500">Data appears as work moves through NexOps.</p>
      </div>
    </div>
  );
}
