import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface ProjectMilestone {
  _id: Types.ObjectId;
  name: string;
  dueDate?: Date;
  completedAt?: Date;
}

export interface Project {
  organisationId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectManagerId?: Types.ObjectId;
  memberIds: Types.ObjectId[];
  startDate?: Date;
  dueDate?: Date;
  estimatedBudgetMinor?: number;
  actualCostMinor: number;
  progress: number;
  tags: string[];
  milestones: ProjectMilestone[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<ProjectMilestone>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    dueDate: Date,
    completedAt: Date,
  },
  { _id: true },
);

const projectSchema = new Schema<Project>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    key: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    description: { type: String, maxlength: 10_000 },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    projectManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: Date,
    dueDate: Date,
    estimatedBudgetMinor: { type: Number, min: 0 },
    actualCostMinor: { type: Number, min: 0, default: 0 },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    milestones: { type: [milestoneSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

projectSchema.index({ organisationId: 1, key: 1 }, { unique: true });
projectSchema.index({ organisationId: 1, clientId: 1, status: 1 });
projectSchema.index({ organisationId: 1, projectManagerId: 1, status: 1 });
projectSchema.index({ organisationId: 1, memberIds: 1 });
applySafeJson(projectSchema);

export const ProjectModel =
  (models.Project as Model<Project> | undefined) ?? model<Project>('Project', projectSchema);
