import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@nexops/shared';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

import { login } from './auth-api';
import { AuthLayout } from './auth-layout';
import { FormField } from './form-field';

import type { LoginInput } from '@nexops/shared';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session);
      const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      void navigate(destination, { replace: true });
    },
  });

  return (
    <AuthLayout
      eyebrow="Account access"
      title="Welcome back"
      description="Sign in to continue managing client delivery, team work, support, and billing."
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void form.handleSubmit((input) => mutation.mutate(input))(event);
        }}
        noValidate
      >
        <FormField
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="maya@agency.com"
          registration={form.register('email')}
          error={form.formState.errors.email}
        />
        <div>
          <div className="flex items-center justify-between">
            <span />
            <Link
              to="/forgot-password"
              className="text-brand-700 dark:text-brand-300 text-xs font-semibold"
            >
              Forgot password?
            </Link>
          </div>
          <FormField
            label="Password"
            type="password"
            autoComplete="current-password"
            registration={form.register('password')}
            error={form.formState.errors.password}
          />
        </div>
        {mutation.isError ? (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {getApiErrorMessage(mutation.error)}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-ink dark:bg-brand-400 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 dark:text-slate-950"
        >
          {mutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}{' '}
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to NexOps AI?{' '}
        <Link to="/register" className="text-brand-700 dark:text-brand-300 font-semibold">
          Create an organisation
        </Link>
      </p>
    </AuthLayout>
  );
}
