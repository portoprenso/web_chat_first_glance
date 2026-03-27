import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import crypto from 'node:crypto';

import mime from 'mime-types';

import type { FileStorage, SaveFileInput, SaveFileResult, StoredFile } from './storage.types.js';

function sanitizeExtension(fileName: string): string {
  const extension = path
    .extname(fileName)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '');
  return extension.slice(0, 10);
}

export class LocalFileStorage implements FileStorage {
  constructor(private readonly baseDirectory: string) {}

  public async save(input: SaveFileInput): Promise<SaveFileResult> {
    const extension = sanitizeExtension(input.originalName);
    const fileName = `${crypto.randomUUID()}${extension}`;
    const storageKey = fileName;
    const targetPath = path.join(this.baseDirectory, storageKey);
    let sizeBytes = 0;

    await mkdir(this.baseDirectory, { recursive: true });

    input.stream.on('data', (chunk: Buffer) => {
      sizeBytes += chunk.length;
    });

    try {
      await pipeline(input.stream, createWriteStream(targetPath));
    } catch (error) {
      await rm(targetPath, { force: true });
      throw error;
    }

    return {
      storageKey,
      sizeBytes,
      originalName: input.originalName,
      mimeType:
        input.contentType && input.contentType !== 'application/octet-stream'
          ? input.contentType
          : mime.lookup(input.originalName) || 'application/octet-stream',
    };
  }

  public read(storageKey: string, originalName: string, contentType: string): Promise<StoredFile> {
    const targetPath = path.join(this.baseDirectory, storageKey);

    return Promise.resolve({
      contentType,
      fileName: originalName,
      stream: createReadStream(targetPath),
    });
  }

  public async remove(storageKey: string): Promise<void> {
    const targetPath = path.join(this.baseDirectory, storageKey);
    await rm(targetPath, { force: true });
  }
}
