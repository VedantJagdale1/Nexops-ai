import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../lib/query-client';

import { RealtimeProvider } from './realtime-provider';

import type { PropsWithChildren } from 'react';

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  );
}
