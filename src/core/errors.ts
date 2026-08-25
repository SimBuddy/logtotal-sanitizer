const ERROR_BRAND = Symbol.for('@socprime/logtotal-sanitizer/error');

/**
 * Machine-readable cause of a {@link SanitizerError}.
 */
export type SanitizerErrorCode =
  | 'INVALID_RULE'
  | 'UNKNOWN_RULE'
  | 'INVALID_KEY'
  | 'INVALID_OPTION'
  | 'ABORTED';

/**
 * Base class for every error this package throws.
 */
export class SanitizerError extends Error {
  /** Machine-readable cause, stable across releases. */
  readonly code: SanitizerErrorCode;

  constructor(code: SanitizerErrorCode, message: string) {
    super(message);
    this.name = 'SanitizerError';
    this.code = code;
    Object.defineProperty(this, ERROR_BRAND, { value: true, enumerable: false });
  }
}

/** A rule object is malformed. */
export class InvalidRuleError extends SanitizerError {
  constructor(message: string) {
    super('INVALID_RULE', message);
    this.name = 'InvalidRuleError';
  }
}

/** A rule identifier does not match any built-in rule. */
export class UnknownRuleError extends SanitizerError {
  constructor(message: string) {
    super('UNKNOWN_RULE', message);
    this.name = 'UnknownRuleError';
  }
}

/** A key is malformed, or no secure random source is available to generate one. */
export class InvalidKeyError extends SanitizerError {
  constructor(message: string) {
    super('INVALID_KEY', message);
    this.name = 'InvalidKeyError';
  }
}

/** An option value is outside its allowed range. */
export class InvalidOptionError extends SanitizerError {
  constructor(message: string) {
    super('INVALID_OPTION', message);
    this.name = 'InvalidOptionError';
  }
}

/** A streaming run was stopped through its `AbortSignal`. */
export class SanitizationAbortedError extends SanitizerError {
  constructor(message = 'Sanitization was aborted.') {
    super('ABORTED', message);
    this.name = 'SanitizationAbortedError';
  }
}

/**
 * Whether a caught value is an error thrown by this package.
 *
 * Prefer this over `instanceof` when the value may have crossed a bundle, worker or realm
 * boundary, where class identity is not preserved.
 */
export function isSanitizerError(value: unknown): value is SanitizerError {
  return typeof value === 'object' && value !== null && ERROR_BRAND in value;
}
