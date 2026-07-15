import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface TicketMessage {
  organisationId: Types.ObjectId;
  ticketId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  internal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ticketMessageSchema = new Schema<TicketMessage>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, immutable: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    content: { type: String, required: true, maxlength: 20_000 },
    internal: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

ticketMessageSchema.index({ organisationId: 1, ticketId: 1, createdAt: 1 });
applySafeJson(ticketMessageSchema);

export const TicketMessageModel =
  (models.TicketMessage as Model<TicketMessage> | undefined) ??
  model<TicketMessage>('TicketMessage', ticketMessageSchema);
