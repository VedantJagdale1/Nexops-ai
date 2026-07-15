import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { AppError } from '../errors/app-error.js';

import { buildTenantFilter } from './tenant-repository.js';

describe('buildTenantFilter', () => {
  it('always adds the authenticated organisation as a mandatory AND condition', () => {
    const organisationId = new Types.ObjectId();
    const filter = buildTenantFilter(organisationId, { status: 'active' });

    expect(filter).toMatchObject({
      $and: [{ organisationId }, { status: 'active' }],
    });
  });

  it('rejects direct and nested attempts to override tenant scope', () => {
    expect(() =>
      buildTenantFilter(new Types.ObjectId(), { organisationId: new Types.ObjectId() }),
    ).toThrow(AppError);
    expect(() =>
      buildTenantFilter(new Types.ObjectId(), {
        $or: [{ status: 'active' }, { organisationId: new Types.ObjectId() }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'TENANT_OVERRIDE_REJECTED' }));
  });

  it('preserves validated internal query operators when Mongoose sanitization is enabled', () => {
    const filter = buildTenantFilter(new Types.ObjectId(), {
      _id: { $in: [] },
      status: { $nin: ['closed'] },
    });

    mongoose.sanitizeFilter(filter);

    expect(filter).toMatchObject({
      $and: [
        { organisationId: expect.any(Types.ObjectId) },
        { _id: { $in: [] }, status: { $nin: ['closed'] } },
      ],
    });
  });
});
