import { InvitationModel } from './invitation.model.js';

import type { Invitation } from './invitation.model.js';
import type { TokenService } from '../auth/token.service.js';
import type { HydratedDocument } from 'mongoose';

export interface CreateInvitationData {
  organisationId: string;
  email: string;
  role: Invitation['role'];
  invitedBy: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface InvitationRepositoryContract {
  create(data: CreateInvitationData): Promise<HydratedDocument<Invitation>>;
  consume(rawToken: string): Promise<Invitation | null>;
  revokePending(organisationId: string, email: string): Promise<void>;
}

export class InvitationRepository implements InvitationRepositoryContract {
  public constructor(private readonly tokens: TokenService) {}

  public async create(data: CreateInvitationData): Promise<HydratedDocument<Invitation>> {
    return InvitationModel.create(data);
  }

  public async consume(rawToken: string): Promise<Invitation | null> {
    return InvitationModel.findOneAndUpdate(
      {
        tokenHash: this.tokens.hashToken(rawToken),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: 'accepted', acceptedAt: new Date() } },
      { new: false },
    )
      .select('+tokenHash')
      .lean<Invitation>()
      .exec();
  }

  public async revokePending(organisationId: string, email: string): Promise<void> {
    await InvitationModel.updateMany(
      { organisationId, email, status: 'pending' },
      { $set: { status: 'revoked' } },
    );
  }
}
