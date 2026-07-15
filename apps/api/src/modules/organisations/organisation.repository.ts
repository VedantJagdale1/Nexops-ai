import { OrganisationModel } from './organisation.model.js';

import type { Organisation } from './organisation.model.js';
import type { HydratedDocument } from 'mongoose';

export interface CreateOrganisationData {
  name: string;
  slug: string;
  timezone: string;
}

export interface OrganisationRepositoryContract {
  create(data: CreateOrganisationData): Promise<HydratedDocument<Organisation>>;
  deleteById(id: string): Promise<void>;
  findById(id: string): Promise<HydratedDocument<Organisation> | null>;
  slugExists(slug: string): Promise<boolean>;
}

export class OrganisationRepository implements OrganisationRepositoryContract {
  public async create(data: CreateOrganisationData): Promise<HydratedDocument<Organisation>> {
    return OrganisationModel.create(data);
  }

  public async deleteById(id: string): Promise<void> {
    await OrganisationModel.deleteOne({ _id: id });
  }

  public async findById(id: string): Promise<HydratedDocument<Organisation> | null> {
    return OrganisationModel.findById(id).exec();
  }

  public async slugExists(slug: string): Promise<boolean> {
    return (await OrganisationModel.exists({ slug })) !== null;
  }
}
