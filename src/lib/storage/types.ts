export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** A URL the browser can open until it expires. */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}
