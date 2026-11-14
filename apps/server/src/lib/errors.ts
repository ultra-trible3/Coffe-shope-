import { ERROR_CODES, type ErrorCode } from '@pharmacy/shared';

/** Base class for all errors that map cleanly onto an HTTP status + error code. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: ErrorCode | string;
      details?: unknown;
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? ERROR_CODES.INTERNAL;
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;
    if (options.cause !== undefined) this.cause = options.cause;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The submitted data is invalid', details?: unknown) {
    super(message, { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, details });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Please sign in to continue') {
    super(message, { statusCode: 401, code: ERROR_CODES.UNAUTHENTICATED });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { statusCode: 403, code: ERROR_CODES.FORBIDDEN });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested record was not found') {
    super(message, { statusCode: 404, code: ERROR_CODES.NOT_FOUND });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The data conflicts with an existing record', details?: unknown) {
    super(message, { statusCode: 409, code: ERROR_CODES.CONFLICT, details });
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'There is not enough stock available', details?: unknown) {
    super(message, { statusCode: 409, code: ERROR_CODES.INSUFFICIENT_STOCK, details });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
