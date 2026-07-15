import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

import cloudinaryPackage from 'cloudinary';

import { AppError } from '../../common/errors/app-error.js';

import type { Environment } from '../../config/env.js';

export interface StoredObject {
  key: string;
  privateLocator: string;
}

export interface StorageService {
  store(organisationId: string, fileName: string, data: Buffer): Promise<StoredObject>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function storageKey(organisationId: string, fileName: string): string {
  const extension = extname(fileName)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '')
    .slice(0, 12);
  return `${organisationId}/${randomUUID()}${extension}`;
}

export class LocalStorageService implements StorageService {
  private readonly root: string;

  public constructor(root: string) {
    this.root = resolve(root);
  }

  public async store(
    organisationId: string,
    fileName: string,
    data: Buffer,
  ): Promise<StoredObject> {
    const key = storageKey(organisationId, fileName);
    const path = this.resolveKey(key);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, data, { flag: 'wx' });
    return { key, privateLocator: `private://${key}` };
  }

  public async read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  public async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(`${this.root}${sep}`)) {
      throw new AppError({
        code: 'STORAGE_KEY_INVALID',
        message: 'Invalid storage key',
        statusCode: 400,
      });
    }
    return path;
  }
}

export class CloudinaryStorageService implements StorageService {
  private readonly cloudinary: typeof cloudinaryPackage.v2;

  public constructor(environment: Environment) {
    const cloudName = environment.CLOUDINARY_CLOUD_NAME;
    const apiKey = environment.CLOUDINARY_API_KEY;
    const apiSecret = environment.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary storage credentials are incomplete');
    }
    this.cloudinary = cloudinaryPackage.v2;
    this.cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  public async store(
    organisationId: string,
    fileName: string,
    data: Buffer,
  ): Promise<StoredObject> {
    const key = storageKey(organisationId, fileName).replace(/\.[^.]+$/, '');
    await new Promise<void>((resolveUpload, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        {
          public_id: key,
          resource_type: 'raw',
          type: 'authenticated',
          overwrite: false,
        },
        (error) =>
          error ? reject(new Error('Cloudinary upload failed', { cause: error })) : resolveUpload(),
      );
      stream.end(data);
    });
    return { key, privateLocator: `cloudinary-authenticated://${key}` };
  }

  public async read(key: string): Promise<Buffer> {
    const url = this.cloudinary.url(key, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true,
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new AppError({
        code: 'DOCUMENT_CONTENT_UNAVAILABLE',
        message: 'Document content is unavailable',
        statusCode: 502,
      });
    }
    return Buffer.from(await response.arrayBuffer());
  }

  public async delete(key: string): Promise<void> {
    await this.cloudinary.uploader.destroy(key, {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    });
  }
}

export function createStorageService(environment: Environment): StorageService {
  if (environment.STORAGE_PROVIDER === 'cloudinary') {
    return new CloudinaryStorageService(environment);
  }
  if (environment.STORAGE_PROVIDER === 's3') {
    throw new Error('S3 storage is not configured; use local or cloudinary storage');
  }
  return new LocalStorageService(environment.LOCAL_STORAGE_PATH);
}
