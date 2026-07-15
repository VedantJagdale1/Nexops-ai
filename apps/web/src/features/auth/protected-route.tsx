import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth-store';

import { refreshSession } from './auth-api';

export function ProtectedRoute(): JSX.Element {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>(
    user ? 'authenticated' : 'loading',
  );

  useEffect(() => {
    if (user) {
      setStatus('authenticated');
      return;
    }
    let active = true;
    void refreshSession()
      .then((session) => {
        if (!active) return;
        setSession(session);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, [clearSession, setSession, user]);

  if (status === 'loading')
    return (
      <main className="bg-canvas grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <LoaderCircle className="text-brand-600 size-5 animate-spin" /> Restoring your secure
          session…
        </div>
      </main>
    );
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
