export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, fields?: FieldErrors) {
    return new AppError(400, 'BAD_REQUEST', message, fields);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do this', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, fields?: FieldErrors) {
    return new AppError(409, 'CONFLICT', message, fields);
  }
}
