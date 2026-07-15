import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface InvoiceLineItem {
  _id: Types.ObjectId;
  description: string;
  quantityMilli: number;
  unitAmountMinor: number;
  totalMinor: number;
}

export interface Invoice {
  organisationId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<InvoiceLineItem>(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantityMilli: { type: Number, required: true, min: 1 },
    unitAmountMinor: { type: Number, required: true, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const invoiceSchema = new Schema<Invoice>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, immutable: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    invoiceNumber: { type: String, required: true, trim: true, maxlength: 40 },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    lineItems: { type: [lineItemSchema], required: true },
    subtotalMinor: { type: Number, required: true, min: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    notes: { type: String, maxlength: 5_000 },
    paymentDate: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);

invoiceSchema.index({ organisationId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ organisationId: 1, clientId: 1, status: 1 });
invoiceSchema.index({ organisationId: 1, status: 1, dueDate: 1 });
applySafeJson(invoiceSchema);

export const InvoiceModel =
  (models.Invoice as Model<Invoice> | undefined) ?? model<Invoice>('Invoice', invoiceSchema);
