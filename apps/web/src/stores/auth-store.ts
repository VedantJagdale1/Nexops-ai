import { create } from 'zustand';

import type { AuthenticatedUserDto, AuthSessionDto } from '@nexops/shared';

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUserDto | null;
  setSession: (session: AuthSessionDto) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (session) => set({ accessToken: session.accessToken, user: session.user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
