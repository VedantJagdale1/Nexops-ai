import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model, Types } from 'mongoose';

export interface Client {
  organisationId: Types.ObjectId;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  industry?: string;
  address?: string;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<Client>(
  {
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      immutable: true,
    },
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    contactName: { type: String, required: true, trim: true, maxlength: 100 },
    contactEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    contactPhone: { type: String, trim: true, maxlength: 40 },
    industry: { type: String, trim: true, maxlength: 100 },
    address: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'inactive', 'prospect'], default: 'active' },
    notes: { type: String, maxlength: 5_000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  },
  { timestamps: true },
);

clientSchema.index({ organisationId: 1, companyName: 1 });
clientSchema.index({ organisationId: 1, status: 1, updatedAt: -1 });
clientSchema.index({ organisationId: 1, contactEmail: 1 });
applySafeJson(clientSchema);

export const ClientModel =
  (models.Client as Model<Client> | undefined) ?? model<Client>('Client', clientSchema);
