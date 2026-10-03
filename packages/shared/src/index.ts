/**
 * Shared generic Result type for robust error handling without unhandled exceptions.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Common string-based ID branding helper.
 */
export type EntityId = string;

/**
 * Utility to format ISO timestamps.
 */
export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}
