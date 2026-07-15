import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface RefreshToken {
  organisationId: Types.ObjectId;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  createdByIp?: string;
  revokedByIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    familyId: { type: String, required: true, immutable: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedByHash: { type: String, select: false },
    createdByIp: String,
    revokedByIp: String,
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1, familyId: 1 });
refreshTokenSchema.index({ organisationId: 1, userId: 1, expiresAt: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel =
  (models.RefreshToken as Model<RefreshToken> | undefined) ??
  model<RefreshToken>('RefreshToken', refreshTokenSchema);
