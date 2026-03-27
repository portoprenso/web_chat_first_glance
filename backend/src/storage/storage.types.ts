import type { Readable } from 'node:stream';

export type SaveFileInput = {
  contentType?: string;
  originalName: string;
  stream: Readable;
};

export type SaveFileResult = {
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storageKey: string;
};

export type StoredFile = {
  contentType: string;
  fileName: string;
  stream: Readable;
};

export interface FileStorage {
  save(input: SaveFileInput): Promise<SaveFileResult>;
  read(storageKey: string, originalName: string, contentType: string): Promise<StoredFile>;
  remove(storageKey: string): Promise<void>;
}
