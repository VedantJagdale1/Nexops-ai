import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export const accountTokenTypes = ['email_verification', 'password_reset'] as const;

export interface AccountToken {
  organisationId: Types.ObjectId;
  userId: Types.ObjectId;
  type: (typeof accountTokenTypes)[number];
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

const accountTokenSchema = new Schema<AccountToken>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    type: { type: String, required: true, enum: accountTokenTypes },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    consumedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

accountTokenSchema.index({ tokenHash: 1, type: 1 }, { unique: true });
accountTokenSchema.index({ organisationId: 1, userId: 1, type: 1 });
accountTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AccountTokenModel =
  (models.AccountToken as Model<AccountToken> | undefined) ??
  model<AccountToken>('AccountToken', accountTokenSchema);
