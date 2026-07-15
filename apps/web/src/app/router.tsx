import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components/app-shell';
import { LoginPage } from '../features/auth/login-page';
import { ProtectedRoute } from '../features/auth/protected-route';
import {
  AcceptInvitationPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '../features/auth/recovery-pages';
import { RegisterPage } from '../features/auth/register-page';
import { LandingPage } from '../pages/landing-page';
import { NotFoundPage } from '../pages/not-found-page';

import type { ComponentType } from 'react';

const lazyPage =
  <TModule, TKey extends keyof TModule>(loader: () => Promise<TModule>, key: TKey) =>
  async () => {
    const module = await loader();
    return { Component: module[key] as ComponentType };
  };

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/accept-invitation', element: <AcceptInvitationPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/dashboard',
            lazy: lazyPage(() => import('../pages/dashboard-page'), 'DashboardPage'),
          },
          {
            path: '/clients',
            lazy: lazyPage(() => import('../pages/clients-page'), 'ClientsPage'),
          },
          {
            path: '/clients/:clientId',
            lazy: lazyPage(() => import('../pages/client-details-page'), 'ClientDetailsPage'),
          },
          {
            path: '/projects',
            lazy: lazyPage(() => import('../pages/projects-page'), 'ProjectsPage'),
          },
          {
            path: '/tickets',
            lazy: lazyPage(() => import('../pages/tickets-page'), 'TicketsPage'),
          },
          {
            path: '/tickets/:ticketId',
            lazy: lazyPage(() => import('../pages/ticket-details-page'), 'TicketDetailsPage'),
          },
          {
            path: '/invoices',
            lazy: lazyPage(() => import('../pages/invoices-page'), 'InvoicesPage'),
          },
          {
            path: '/invoices/:invoiceId',
            lazy: lazyPage(() => import('../pages/invoice-details-page'), 'InvoiceDetailsPage'),
          },
          {
            path: '/notifications',
            lazy: lazyPage(() => import('../pages/notifications-page'), 'NotificationsPage'),
          },
          {
            path: '/projects/:projectId',
            lazy: lazyPage(() => import('../pages/project-layout'), 'ProjectLayout'),
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              {
                path: 'overview',
                lazy: lazyPage(
                  () => import('../pages/project-overview-page'),
                  'ProjectOverviewPage',
                ),
              },
              {
                path: 'tasks',
                lazy: lazyPage(() => import('../pages/kanban-page'), 'KanbanPage'),
              },
              {
                path: 'members',
                lazy: lazyPage(() => import('../pages/project-members-page'), 'ProjectMembersPage'),
              },
              {
                path: 'documents',
                lazy: lazyPage(
                  () => import('../pages/project-documents-page'),
                  'ProjectDocumentsPage',
                ),
              },
              {
                path: 'chat',
                lazy: lazyPage(() => import('../pages/project-chat-page'), 'ProjectChatPage'),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
