import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface TaskComment {
  organisationId: Types.ObjectId;
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskCommentSchema = new Schema<TaskComment>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, immutable: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    content: { type: String, required: true, trim: true, maxlength: 10_000 },
    editedAt: Date,
  },
  { timestamps: true },
);

taskCommentSchema.index({ organisationId: 1, taskId: 1, createdAt: 1 });
applySafeJson(taskCommentSchema);

export const TaskCommentModel =
  (models.TaskComment as Model<TaskComment> | undefined) ??
  model<TaskComment>('TaskComment', taskCommentSchema);
