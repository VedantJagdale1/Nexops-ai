import bcrypt from 'bcrypt';

import { AppError } from '../../common/errors/app-error.js';

import type { InvitationRepositoryContract } from './invitation.repository.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { AuthService } from '../auth/auth.service.js';
import type { IssuedSession, RequestMetadata } from '../auth/auth.types.js';
import type { TokenService } from '../auth/token.service.js';
import type { OrganisationRepositoryContract } from '../organisations/organisation.repository.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  AcceptInvitationInput,
  AuthenticatedUserDto,
  CreateInvitationInput,
} from '@nexops/shared';

export class InvitationService {
  public constructor(
    private readonly invitations: InvitationRepositoryContract,
    private readonly organisations: OrganisationRepositoryContract,
    private readonly users: UserRepositoryContract,
    private readonly tokens: TokenService,
    private readonly auth: AuthService,
    private readonly email: EmailService,
  ) {}

  public async create(input: CreateInvitationInput, actor: AuthenticatedUserDto) {
    if (await this.users.emailExists(input.email)) {
      throw new AppError({
        code: 'USER_ALREADY_EXISTS',
        message: 'A user with this email already belongs to an organisation',
        statusCode: 409,
      });
    }

    const organisation = await this.organisations.findById(actor.organisationId);
    if (!organisation) {
      throw new AppError({
        code: 'ORGANISATION_NOT_FOUND',
        message: 'Organisation not found',
        statusCode: 404,
      });
    }

    await this.invitations.revokePending(actor.organisationId, input.email);
    const token = this.tokens.createAccountToken();
    const invitation = await this.invitations.create({
      organisationId: actor.organisationId,
      email: input.email,
      role: input.role,
      invitedBy: actor.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
    });
    await this.email.sendInvitation(input.email, token.raw, organisation.name);

    return {
      id: invitation._id.toString(),
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  public async accept(
    input: AcceptInvitationInput,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    const invitation = await this.invitations.consume(input.token);
    if (!invitation) {
      throw new AppError({
        code: 'INVALID_INVITATION',
        message: 'The invitation is invalid or expired',
        statusCode: 400,
      });
    }

    if (await this.users.emailExists(invitation.email)) {
      throw new AppError({
        code: 'USER_ALREADY_EXISTS',
        message: 'This invitation has already been accepted',
        statusCode: 409,
      });
    }

    const user = await this.users.create({
      organisationId: invitation.organisationId.toString(),
      name: input.name,
      email: invitation.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: invitation.role,
      status: 'active',
      emailVerified: true,
    });
    return this.auth.createSession(user, metadata);
  }
}
