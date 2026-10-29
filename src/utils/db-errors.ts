// Drizzle wraps driver errors, so the Postgres error code may sit on `cause`.
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const pgError = (err as { cause?: unknown })?.cause ?? err;
  const { code, constraint: name } = (pgError ?? {}) as { code?: string; constraint?: string };
  return code === '23505' && (!constraint || name === constraint);
}
