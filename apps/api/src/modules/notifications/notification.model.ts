import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface Notification {
  organisationId: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    type: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1_000 },
    entityType: { type: String, maxlength: 80 },
    entityId: Schema.Types.ObjectId,
    isRead: { type: Boolean, required: true, default: false },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ organisationId: 1, userId: 1, isRead: 1, createdAt: -1 });
applySafeJson(notificationSchema);

export const NotificationModel =
  (models.Notification as Model<Notification> | undefined) ??
  model<Notification>('Notification', notificationSchema);
