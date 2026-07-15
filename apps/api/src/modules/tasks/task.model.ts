import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'completed'] as const;

export interface TaskChecklistItem {
  _id: Types.ObjectId;
  text: string;
  completed: boolean;
}

export interface Task {
  organisationId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status: (typeof taskStatuses)[number];
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeIds: Types.ObjectId[];
  reporterId: Types.ObjectId;
  dueDate?: Date;
  estimatedMinutes?: number;
  loggedMinutes: number;
  labels: string[];
  checklist: TaskChecklistItem[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const checklistSchema = new Schema<TaskChecklistItem>(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    completed: { type: Boolean, required: true, default: false },
  },
  { _id: true },
);

const taskSchema = new Schema<Task>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, immutable: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 20_000 },
    status: { type: String, enum: taskStatuses, required: true, default: 'backlog' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: Date,
    estimatedMinutes: { type: Number, min: 0 },
    loggedMinutes: { type: Number, min: 0, default: 0 },
    labels: [{ type: String, trim: true, maxlength: 40 }],
    checklist: { type: [checklistSchema], default: [] },
    position: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, optimisticConcurrency: true },
);

taskSchema.index({ organisationId: 1, projectId: 1, status: 1, position: 1 });
taskSchema.index({ organisationId: 1, assigneeIds: 1, status: 1, dueDate: 1 });
applySafeJson(taskSchema);

export const TaskModel =
  (models.Task as Model<Task> | undefined) ?? model<Task>('Task', taskSchema);
