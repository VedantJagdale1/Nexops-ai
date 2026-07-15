import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export const ticketStatuses = [
  'open',
  'assigned',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
] as const;

export interface Ticket {
  organisationId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  subject: string;
  description: string;
  category: 'bug' | 'feature_request' | 'question' | 'access' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: (typeof ticketStatuses)[number];
  slaDeadline?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<Ticket>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, immutable: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 20_000 },
    category: {
      type: String,
      enum: ['bug', 'feature_request', 'question', 'access', 'billing', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ticketStatuses, default: 'open' },
    slaDeadline: Date,
    resolvedAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);

ticketSchema.index({ organisationId: 1, status: 1, priority: 1, updatedAt: -1 });
ticketSchema.index({ organisationId: 1, clientId: 1, status: 1 });
ticketSchema.index({ organisationId: 1, assignedTo: 1, status: 1 });
applySafeJson(ticketSchema);

export const TicketModel =
  (models.Ticket as Model<Ticket> | undefined) ?? model<Ticket>('Ticket', ticketSchema);
