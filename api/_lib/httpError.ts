// A typed error that carries an HTTP status, so API handlers can signal client
// errors (4xx — malformed body, missing required field) distinctly from
// unexpected server failures (5xx). The route handler maps HttpError.status onto
// the response; anything else falls back to a generic 500.

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    // Preserve the prototype chain so `instanceof HttpError` holds even when the
    // class is transpiled and thrown across module boundaries.
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/** HTTP status to respond with for a thrown value: HttpError.status, else 500. */
export function statusFromError(error: unknown): number {
  return error instanceof HttpError && Number.isInteger(error.status) ? error.status : 500
}

/** A human-readable message for a thrown value, without leaking non-Error shapes. */
export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
