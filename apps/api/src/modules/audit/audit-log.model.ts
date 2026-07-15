import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface AuditLog {
  organisationId: Types.ObjectId;
  actorId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, maxlength: 120 },
    entityType: { type: String, required: true, maxlength: 80 },
    entityId: Schema.Types.ObjectId,
    previousValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, maxlength: 80 },
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ organisationId: 1, createdAt: -1 });
auditLogSchema.index({ organisationId: 1, entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ organisationId: 1, actorId: 1, createdAt: -1 });
applySafeJson(auditLogSchema);

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog> | undefined) ?? model<AuditLog>('AuditLog', auditLogSchema);
