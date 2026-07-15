import { apiClient, renewSession } from '../../lib/api-client';

import type { ApiSuccess } from '../../lib/api-client';
import type {
  AcceptInvitationInput,
  AuthSessionDto,
  ForgotPasswordInput,
  LoginInput,
  RegisterOrganisationInput,
  ResetPasswordInput,
} from '@nexops/shared';

export async function login(input: LoginInput): Promise<AuthSessionDto> {
  const response = await apiClient.post<ApiSuccess<AuthSessionDto>>('/auth/login', input);
  return response.data.data;
}

export async function registerOrganisation(
  input: RegisterOrganisationInput,
): Promise<AuthSessionDto> {
  const response = await apiClient.post<ApiSuccess<AuthSessionDto>>('/auth/register', input);
  return response.data.data;
}

export async function refreshSession(): Promise<AuthSessionDto> {
  return renewSession();
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<string> {
  const response = await apiClient.post<ApiSuccess<{ message: string }>>(
    '/auth/forgot-password',
    input,
  );
  return response.data.data.message;
}

export async function resetPassword(input: ResetPasswordInput): Promise<string> {
  const response = await apiClient.post<ApiSuccess<{ message: string }>>(
    '/auth/reset-password',
    input,
  );
  return response.data.data.message;
}

export async function acceptInvitation(input: AcceptInvitationInput): Promise<AuthSessionDto> {
  const response = await apiClient.post<ApiSuccess<AuthSessionDto>>('/invitations/accept', input);
  return response.data.data;
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/verify-email', { token });
}
