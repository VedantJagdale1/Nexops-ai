import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { LocalStorageService } from './storage.service.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('LocalStorageService', () => {
  it('stores private content under a generated tenant key and deletes it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nexops-storage-'));
    roots.push(root);
    const storage = new LocalStorageService(root);
    const content = Buffer.from('confidential project brief');

    const stored = await storage.store('org-123', 'brief.pdf', content);

    expect(stored.key).toMatch(/^org-123\/[a-f0-9-]+\.pdf$/);
    expect(await storage.read(stored.key)).toEqual(content);
    await storage.delete(stored.key);
    await expect(storage.read(stored.key)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects keys that escape the configured root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nexops-storage-'));
    roots.push(root);
    const storage = new LocalStorageService(root);

    await expect(storage.read('../secret.txt')).rejects.toMatchObject({
      code: 'STORAGE_KEY_INVALID',
    });
  });
});
