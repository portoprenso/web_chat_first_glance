export type RequestMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
