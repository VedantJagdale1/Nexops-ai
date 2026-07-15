import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface InvoiceCounter {
  organisationId: Types.ObjectId;
  nextValue: number;
}

const invoiceCounterSchema = new Schema<InvoiceCounter>({
  organisationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    unique: true,
  },
  nextValue: { type: Number, required: true, min: 0, default: 0 },
});

export const InvoiceCounterModel =
  (models.InvoiceCounter as Model<InvoiceCounter> | undefined) ??
  model<InvoiceCounter>('InvoiceCounter', invoiceCounterSchema);
