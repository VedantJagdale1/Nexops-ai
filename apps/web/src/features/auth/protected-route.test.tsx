import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../stores/auth-store';

import { ProtectedRoute } from './protected-route';

const { refreshSessionMock } = vi.hoisted(() => ({ refreshSessionMock: vi.fn() }));

vi.mock('./auth-api', () => ({
  refreshSession: refreshSessionMock,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    refreshSessionMock.mockReset();
    useAuthStore.getState().clearSession();
  });

  it('redirects anonymous users after refresh-cookie recovery fails', async () => {
    refreshSessionMock.mockRejectedValue(new Error('No session'));
    const router = createMemoryRouter(
      [
        {
          element: <ProtectedRoute />,
          children: [{ path: '/dashboard', element: <div>Private dashboard</div> }],
        },
        { path: '/login', element: <div>Login screen</div> },
      ],
      { initialEntries: ['/dashboard'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Login screen')).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('renders protected content when an in-memory session exists', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        organisationId: 'org-1',
        name: 'Maya Shah',
        email: 'maya@example.com',
        role: 'owner',
        emailVerified: true,
      },
    });
    const router = createMemoryRouter(
      [
        {
          element: <ProtectedRoute />,
          children: [{ path: '/dashboard', element: <div>Private dashboard</div> }],
        },
      ],
      { initialEntries: ['/dashboard'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Private dashboard')).toBeVisible();
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });
});
