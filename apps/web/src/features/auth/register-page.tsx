import { zodResolver } from '@hookform/resolvers/zod';
import { registerOrganisationSchema } from '@nexops/shared';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

import { registerOrganisation } from './auth-api';
import { AuthLayout } from './auth-layout';
import { FormField } from './form-field';

import type { RegisterOrganisationInput } from '@nexops/shared';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<RegisterOrganisationInput>({
    resolver: zodResolver(registerOrganisationSchema),
    defaultValues: {
      organisationName: '',
      name: '',
      email: '',
      password: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });
  const mutation = useMutation({
    mutationFn: registerOrganisation,
    onSuccess: (session) => {
      setSession(session);
      void navigate('/dashboard', { replace: true });
    },
  });

  return (
    <AuthLayout
      eyebrow="New workspace"
      title="Create your organisation"
      description="Start with a secure, isolated workspace. You will be its owner and can invite the rest of your team."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit((input) => mutation.mutate(input))(event);
        }}
        noValidate
      >
        <FormField
          label="Organisation name"
          placeholder="Northstar Digital"
          autoComplete="organization"
          registration={form.register('organisationName')}
          error={form.formState.errors.organisationName}
        />
        <FormField
          label="Your name"
          placeholder="Maya Shah"
          autoComplete="name"
          registration={form.register('name')}
          error={form.formState.errors.name}
        />
        <FormField
          label="Work email"
          type="email"
          placeholder="maya@agency.com"
          autoComplete="email"
          registration={form.register('email')}
          error={form.formState.errors.email}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          registration={form.register('password')}
          error={form.formState.errors.password}
        />
        <input type="hidden" {...form.register('timezone')} />
        {mutation.isError ? (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {getApiErrorMessage(mutation.error)}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-ink dark:bg-brand-400 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-950"
        >
          {mutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}{' '}
          Create workspace
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-700 dark:text-brand-300 font-semibold">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
