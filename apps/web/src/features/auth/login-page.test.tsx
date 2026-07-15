import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../stores/auth-store';

import { LoginPage } from './login-page';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('./auth-api', () => ({
  login: loginMock,
}));

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/dashboard', element: <div>Secure dashboard</div> },
    ],
    { initialEntries: ['/login'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    useAuthStore.getState().clearSession();
  });

  it('shows validation errors without sending invalid credentials', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email/i)).toBeVisible();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('stores a successful session and navigates to the dashboard', async () => {
    loginMock.mockResolvedValue({
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
    renderLogin();
    await userEvent.type(screen.getByLabelText(/work email/i), 'maya@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Strong!Pass123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Secure dashboard')).toBeVisible();
    expect(useAuthStore.getState().accessToken).toBe('access-token');
  });
});
