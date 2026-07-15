import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './app/providers';
import { router } from './app/router';
import './styles.css';

const savedTheme = localStorage.getItem('nexops-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle(
  'dark',
  savedTheme === 'dark' || (savedTheme === null && prefersDark),
);

const root = document.querySelector<HTMLDivElement>('#root');

if (!root) throw new Error('Application root element was not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
