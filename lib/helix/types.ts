export interface HelixPagination {
  cursor?: string;
}

export interface HelixResponse<T> {
  data: T[];
  pagination?: HelixPagination;
}

export interface HelixRequestOptions {
  path: string;
  searchParams?: Record<string, string | readonly string[] | undefined>;
  signal?: AbortSignal;
}

export class HelixApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HelixApiError';
  }
}

export class HelixAuthError extends HelixApiError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'HelixAuthError';
  }
}
