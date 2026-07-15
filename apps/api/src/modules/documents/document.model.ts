import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface Document {
  organisationId: Types.ObjectId;
  projectId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  ticketId?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  name: string;
  fileUrl: string;
  storageKey: string;
  mimeType: string;
  size: number;
  category: string;
  deletedAt?: Date;
  createdAt: Date;
}

const documentSchema = new Schema<Document>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true },
    storageKey: { type: String, required: true, immutable: true },
    mimeType: { type: String, required: true, maxlength: 150 },
    size: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    deletedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentSchema.index({ organisationId: 1, storageKey: 1 }, { unique: true });
documentSchema.index({ organisationId: 1, projectId: 1, createdAt: -1 });
documentSchema.index({ organisationId: 1, clientId: 1, createdAt: -1 });
applySafeJson(documentSchema);

export const DocumentModel =
  (models.Document as Model<Document> | undefined) ?? model<Document>('Document', documentSchema);
