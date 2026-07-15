import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { UserModel } from './user.model.js';

import type { User } from './user.model.js';
import type { HydratedDocument } from 'mongoose';

export interface CreateUserData {
  organisationId: string;
  clientId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: User['role'];
  status?: User['status'];
  emailVerified?: boolean;
}

export interface UserRepositoryContract {
  create(data: CreateUserData): Promise<HydratedDocument<User>>;
  deleteById(id: string): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  findByEmailWithPassword(email: string): Promise<HydratedDocument<User> | null>;
  findById(id: string): Promise<HydratedDocument<User> | null>;
  markLogin(id: string, date: Date): Promise<void>;
  membersBelongToOrganisation(organisationId: string, ids: readonly string[]): Promise<boolean>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
}

export class UserRepository implements UserRepositoryContract {
  public async create(data: CreateUserData): Promise<HydratedDocument<User>> {
    return UserModel.create(data);
  }

  public async deleteById(id: string): Promise<void> {
    await UserModel.deleteOne({ _id: id });
  }

  public async emailExists(email: string): Promise<boolean> {
    return (await UserModel.exists({ email })) !== null;
  }

  public async findByEmailWithPassword(email: string): Promise<HydratedDocument<User> | null> {
    return UserModel.findOne({ email }).select('+passwordHash').exec();
  }

  public async findById(id: string): Promise<HydratedDocument<User> | null> {
    return UserModel.findById(id).exec();
  }

  public async markLogin(id: string, date: Date): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { lastLoginAt: date } });
  }

  public async membersBelongToOrganisation(
    organisationId: string,
    ids: readonly string[],
  ): Promise<boolean> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return true;
    const count = await UserModel.countDocuments(
      buildTenantFilter(organisationId, {
        _id: { $in: uniqueIds },
        status: { $in: ['active', 'invited'] },
      }),
    );
    return count === uniqueIds.length;
  }

  public async updatePassword(id: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { passwordHash } });
  }

  public async verifyEmail(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { emailVerified: true } });
  }
}
