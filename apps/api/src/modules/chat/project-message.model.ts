import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface ProjectMessage {
  organisationId: Types.ObjectId;
  projectId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[];
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectMessageSchema = new Schema<ProjectMessage>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, immutable: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    content: { type: String, required: true, maxlength: 20_000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    editedAt: Date,
  },
  { timestamps: true },
);

projectMessageSchema.index({ organisationId: 1, projectId: 1, createdAt: -1 });
projectMessageSchema.index({ organisationId: 1, mentions: 1, createdAt: -1 });
applySafeJson(projectMessageSchema);

export const ProjectMessageModel =
  (models.ProjectMessage as Model<ProjectMessage> | undefined) ??
  model<ProjectMessage>('ProjectMessage', projectMessageSchema);
