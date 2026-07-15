import { zodResolver } from '@hookform/resolvers/zod';
import {
  acceptInvitationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  strongPasswordSchema,
} from '@nexops/shared';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { getApiErrorMessage } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

import { acceptInvitation, forgotPassword, resetPassword, verifyEmail } from './auth-api';
import { AuthLayout } from './auth-layout';
import { FormField } from './form-field';

import type { ForgotPasswordInput } from '@nexops/shared';

const passwordFormSchema = z.object({ password: strongPasswordSchema });
type PasswordForm = z.infer<typeof passwordFormSchema>;
const invitationFormSchema = acceptInvitationSchema.omit({ token: true });
type InvitationForm = z.infer<typeof invitationFormSchema>;

export function ForgotPasswordPage(): JSX.Element {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const mutation = useMutation({ mutationFn: forgotPassword });
  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your work email. For security, the response is the same whether or not an account exists."
    >
      {mutation.isSuccess ? (
        <SuccessMessage message={mutation.data} />
      ) : (
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
            registration={form.register('email')}
            error={form.formState.errors.email}
          />
          <MutationError mutation={mutation} />
          <SubmitButton pending={mutation.isPending}>Send reset instructions</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage(): JSX.Element {
  const [parameters] = useSearchParams();
  const token = parameters.get('token') ?? '';
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: '' },
  });
  const mutation = useMutation({ mutationFn: resetPassword });
  const submit = (input: PasswordForm) =>
    mutation.mutate(resetPasswordSchema.parse({ ...input, token }));
  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Use a unique password with at least ten characters, mixed case, a number, and a symbol."
    >
      {!token ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          This reset link is missing its secure token.
        </p>
      ) : mutation.isSuccess ? (
        <SuccessMessage message={mutation.data} action="Return to sign in" />
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
          noValidate
        >
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            registration={form.register('password')}
            error={form.formState.errors.password}
          />
          <MutationError mutation={mutation} />
          <SubmitButton pending={mutation.isPending}>Update password</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}

export function AcceptInvitationPage(): JSX.Element {
  const [parameters] = useSearchParams();
  const token = parameters.get('token') ?? '';
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: { name: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: (session) => {
      setSession(session);
      void navigate('/dashboard', { replace: true });
    },
  });
  const submit = (input: InvitationForm) => mutation.mutate({ ...input, token });
  return (
    <AuthLayout
      eyebrow="Team invitation"
      title="Join your organisation"
      description="Complete your profile to join the secure workspace that invited you."
    >
      {!token ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          This invitation link is missing its secure token.
        </p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
          noValidate
        >
          <FormField
            label="Your name"
            autoComplete="name"
            registration={form.register('name')}
            error={form.formState.errors.name}
          />
          <FormField
            label="Create password"
            type="password"
            autoComplete="new-password"
            registration={form.register('password')}
            error={form.formState.errors.password}
          />
          <MutationError mutation={mutation} />
          <SubmitButton pending={mutation.isPending}>Accept invitation</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}

export function VerifyEmailPage(): JSX.Element {
  const [parameters] = useSearchParams();
  const token = parameters.get('token') ?? '';
  const mutation = useMutation({
    mutationFn: verifyEmail,
  });
  const { isIdle, mutate } = mutation;
  useEffect(() => {
    if (token && isIdle) mutate(token);
  }, [isIdle, mutate, token]);
  return (
    <AuthLayout
      eyebrow="Email verification"
      title="Confirming your email"
      description="This protects your account and keeps important project notifications deliverable."
    >
      {mutation.isPending ? (
        <p className="flex items-center gap-3 text-sm text-slate-500">
          <LoaderCircle className="size-5 animate-spin" /> Verifying your secure link…
        </p>
      ) : mutation.isSuccess ? (
        <SuccessMessage message="Your email is verified." action="Continue to sign in" />
      ) : (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          The verification link is invalid or expired.
        </p>
      )}
    </AuthLayout>
  );
}

function SubmitButton({ children, pending }: { children: string; pending: boolean }): JSX.Element {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink dark:bg-brand-400 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-950"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function MutationError({
  mutation,
}: {
  mutation: { isError: boolean; error: unknown };
}): JSX.Element | null {
  return mutation.isError ? (
    <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
      {getApiErrorMessage(mutation.error)}
    </p>
  ) : null;
}

function SuccessMessage({
  message,
  action = 'Return to sign in',
}: {
  message: string;
  action?: string;
}): JSX.Element {
  return (
    <div className="border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-100 rounded-2xl border p-5">
      <CheckCircle2 className="size-6" />
      <p className="mt-3 text-sm leading-6">{message}</p>
      <Link
        to="/login"
        className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
      >
        {action}
      </Link>
    </div>
  );
}
