import { roleHasPermission } from '@nexops/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ReceiptText,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { logout } from '../features/auth/auth-api';
import { listNotifications } from '../features/operations/operations-api';
import { useAuthStore } from '../stores/auth-store';
import { useUiStore } from '../stores/ui-store';

import { BrandMark } from './brand-mark';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'analytics:read' },
  { to: '/clients', label: 'Clients', icon: Building2, permission: 'client:read' },
  { to: '/projects', label: 'Projects', icon: BriefcaseBusiness, permission: 'project:read' },
  { to: '/tickets', label: 'Tickets', icon: LifeBuoy, permission: 'ticket:read' },
  { to: '/invoices', label: 'Invoices', icon: ReceiptText, permission: 'invoice:read' },
] as const;

function Sidebar({
  mobileOpen,
  closeMobile,
}: {
  mobileOpen: boolean;
  closeMobile: () => void;
}): JSX.Element {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);
  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
          onClick={closeMobile}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex border-r border-slate-200 bg-slate-950 text-white transition-[width,transform] dark:border-white/10 ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-72 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex h-12 items-center justify-between gap-3 px-2">
            <Link to="/dashboard" className="flex min-w-0 items-center gap-3" onClick={closeMobile}>
              <BrandMark />
              <span
                className={`${collapsed ? 'lg:hidden' : ''} truncate text-sm font-semibold tracking-wide`}
              >
                NexOps AI
              </span>
            </Link>
            <button
              aria-label="Close navigation"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
              onClick={closeMobile}
            >
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Primary navigation" className="mt-8 space-y-1">
            {navigation
              .filter(({ permission }) => Boolean(user && roleHasPermission(user.role, permission)))
              .map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-brand-500 shadow-brand-950/30 text-white shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <Icon className="size-5 shrink-0" />
                  <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
                </NavLink>
              ))}
          </nav>
          <div
            className={`mt-auto rounded-xl border border-white/10 bg-white/5 p-3 ${collapsed ? 'lg:p-2' : ''}`}
          >
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]" />
              <span className={collapsed ? 'lg:hidden' : ''}>All systems operational</span>
            </div>
          </div>
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggle}
            className="mt-3 hidden h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-400 hover:bg-white/10 hover:text-white lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
            <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppShell(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: 30_000,
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('nexops-theme', dark ? 'dark' : 'light');
  }, [dark]);
  const parts = location.pathname.split('/').filter(Boolean);
  const signOut = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      void navigate('/login', { replace: true });
    }
  };
  return (
    <div className="bg-canvas text-ink min-h-screen dark:bg-slate-950 dark:text-slate-50">
      <Sidebar mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
      <div className={`min-h-screen transition-[padding] ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              aria-label="Open navigation"
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-white/5"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Global search"
                placeholder="Search workspace…"
                className="focus:border-brand-400 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:bg-white dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                aria-label={dark ? 'Use light theme' : 'Use dark theme'}
                className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                onClick={() => setDark((value) => !value)}
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <Bell className="size-4" />
                {(notifications.data?.meta.unread ?? 0) > 0 ? (
                  <span className="absolute right-1.5 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                    {Math.min(notifications.data?.meta.unread ?? 0, 99)}
                  </span>
                ) : null}
              </Link>
              <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex dark:border-white/10">
                <div className="bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200 grid size-9 place-items-center rounded-xl text-sm font-bold">
                  {user?.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button
                aria-label="Sign out"
                className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-500"
          >
            <Link to="/dashboard">Workspace</Link>
            {parts.map((part, index) => (
              <span key={`${part}-${index}`} className="flex items-center gap-1.5">
                <ChevronRight className="size-3" />
                <span
                  className={index === parts.length - 1 ? 'text-slate-900 dark:text-white' : ''}
                >
                  {part.length === 24 ? 'Details' : part.replaceAll('-', ' ')}
                </span>
              </span>
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
