import { AccountTokenModel } from './account-token.model.js';

import type { AccountToken } from './account-token.model.js';
import type { TokenService } from './token.service.js';

export interface AccountTokenRepositoryContract {
  create(data: {
    organisationId: string;
    userId: string;
    type: AccountToken['type'];
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  consume(rawToken: string, type: AccountToken['type']): Promise<AccountToken | null>;
}

export class AccountTokenRepository implements AccountTokenRepositoryContract {
  public constructor(private readonly tokenService: TokenService) {}

  public async create(data: {
    organisationId: string;
    userId: string;
    type: AccountToken['type'];
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await AccountTokenModel.create(data);
  }

  public async consume(rawToken: string, type: AccountToken['type']): Promise<AccountToken | null> {
    return AccountTokenModel.findOneAndUpdate(
      {
        tokenHash: this.tokenService.hashToken(rawToken),
        type,
        consumedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { $set: { consumedAt: new Date() } },
      { new: false },
    )
      .select('+tokenHash')
      .lean<AccountToken>()
      .exec();
  }
}
