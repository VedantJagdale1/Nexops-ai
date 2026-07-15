import mongoose from 'mongoose';

import { AppError } from '../errors/app-error.js';
import { Types } from '../mongoose.js';

import type { Types as MongooseTypes } from 'mongoose';

type QueryValue =
  null | boolean | number | string | Date | MongooseTypes.ObjectId | QueryFilter | QueryValue[];
export interface QueryFilter {
  [key: string]: QueryValue;
}

function containsOrganisationOverride(value: QueryValue): boolean {
  if (Array.isArray(value)) return value.some((item) => containsOrganisationOverride(item));
  if (value === null || value instanceof Date || value instanceof Types.ObjectId) return false;
  if (typeof value !== 'object') return false;
  if (Object.hasOwn(value, 'organisationId')) return true;
  return Object.values(value).some((item) => containsOrganisationOverride(item));
}

function trustInternalOperators(value: QueryValue): QueryValue {
  if (Array.isArray(value)) return value.map((item) => trustInternalOperators(item));
  if (value === null || value instanceof Date || value instanceof Types.ObjectId) return value;
  if (typeof value !== 'object') return value;

  const trustedEntries = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, trustInternalOperators(item)]),
  );
  return Object.keys(trustedEntries).some((key) => key.startsWith('$'))
    ? mongoose.trusted(trustedEntries)
    : trustedEntries;
}

export function buildTenantFilter(
  organisationId: string | MongooseTypes.ObjectId,
  filter: QueryFilter = {},
): QueryFilter {
  if (containsOrganisationOverride(filter)) {
    throw new AppError({
      code: 'TENANT_OVERRIDE_REJECTED',
      message: 'Tenant scope cannot be supplied by the caller',
      statusCode: 400,
    });
  }

  const tenantId =
    organisationId instanceof Types.ObjectId ? organisationId : new Types.ObjectId(organisationId);

  return { $and: [{ organisationId: tenantId }, trustInternalOperators(filter)] };
}
