import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('presents the product and an accessible registration action', () => {
    const router = createMemoryRouter([{ path: '/', element: <LandingPage /> }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { name: /client delivery, under control/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /create your workspace/i })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
  });
});
