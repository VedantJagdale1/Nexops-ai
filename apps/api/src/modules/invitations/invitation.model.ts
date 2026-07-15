import { userRoles } from '@nexops/shared';

import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export const invitationStatuses = ['pending', 'accepted', 'expired', 'revoked'] as const;

export interface Invitation {
  organisationId: Types.ObjectId;
  email: string;
  role: Exclude<(typeof userRoles)[number], 'owner'>;
  invitedBy: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt?: Date;
  status: (typeof invitationStatuses)[number];
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<Invitation>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    role: {
      type: String,
      required: true,
      enum: userRoles.filter((role) => role !== 'owner'),
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
    status: { type: String, required: true, enum: invitationStatuses, default: 'pending' },
  },
  { timestamps: true },
);

invitationSchema.index(
  { organisationId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
invitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } },
);
applySafeJson(invitationSchema);

export const InvitationModel =
  (models.Invitation as Model<Invitation> | undefined) ??
  model<Invitation>('Invitation', invitationSchema);
