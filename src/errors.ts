import type { ApiErrorBody } from './types'

/**
 * Error thrown when the ReelScribe API returns a non-2xx response.
 */
export class ReelScribeError extends Error {
  /** Machine-readable error code (e.g. `INSUFFICIENT_CREDITS`). */
  readonly code: string
  /** HTTP status code. */
  readonly status: number

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ReelScribeError'
    this.code = body.code
    this.status = body.status
  }
}
