import { z } from 'zod';

import { userRoles } from './permissions.js';

export const strongPasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z\d]/, 'Password must contain a special character');

export const registerOrganisationSchema = z.object({
  organisationName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: strongPasswordSchema,
  timezone: z.string().trim().min(1).max(80).default('UTC'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  password: strongPasswordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(512),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(userRoles).exclude(['owner']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32).max(512),
  name: z.string().trim().min(2).max(100),
  password: strongPasswordSchema,
});

export interface AuthenticatedUserDto {
  id: string;
  organisationId: string;
  clientId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: z.infer<typeof createInvitationSchema>['role'] | 'owner';
  emailVerified: boolean;
}

export interface AuthSessionDto {
  accessToken: string;
  user: AuthenticatedUserDto;
}

export type RegisterOrganisationInput = z.infer<typeof registerOrganisationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
