import { applySafeJson } from '../../common/models/model-options.js';
import { model, models, Schema } from '../../common/mongoose.js';

import type { Model } from 'mongoose';

export interface OrganisationSettings {
  dateFormat: string;
  weekStartsOn: number;
}

export interface Organisation {
  name: string;
  slug: string;
  logoUrl?: string;
  industry?: string;
  website?: string;
  timezone: string;
  defaultCurrency: string;
  settings: OrganisationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const organisationSchema = new Schema<Organisation>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    logoUrl: { type: String, trim: true },
    industry: { type: String, trim: true, maxlength: 100 },
    website: { type: String, trim: true },
    timezone: { type: String, required: true, default: 'UTC' },
    defaultCurrency: { type: String, required: true, uppercase: true, default: 'USD' },
    settings: {
      dateFormat: { type: String, required: true, default: 'yyyy-MM-dd' },
      weekStartsOn: { type: Number, required: true, min: 0, max: 6, default: 1 },
    },
  },
  { timestamps: true },
);

organisationSchema.index({ slug: 1 }, { unique: true });
applySafeJson(organisationSchema);

export const OrganisationModel =
  (models.Organisation as Model<Organisation> | undefined) ??
  model<Organisation>('Organisation', organisationSchema);
