export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: Array<{ path?: string; message: string }>;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Array<{ path?: string; message: string }>;

  public constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? [];
  }
}
