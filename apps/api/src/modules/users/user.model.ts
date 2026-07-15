import { userRoles } from '@nexops/shared';

import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export const userStatuses = ['invited', 'active', 'suspended', 'disabled'] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface User {
  organisationId: Types.ObjectId;
  clientId?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  role: (typeof userRoles)[number];
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, trim: true },
    role: { type: String, required: true, enum: userRoles },
    status: { type: String, required: true, enum: userStatuses, default: 'active' },
    emailVerified: { type: Boolean, required: true, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ organisationId: 1, status: 1, role: 1 });
userSchema.index({ organisationId: 1, clientId: 1 }, { sparse: true });
applySafeJson(userSchema);

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
