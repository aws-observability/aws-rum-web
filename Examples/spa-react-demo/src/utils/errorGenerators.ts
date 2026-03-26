import { ErrorType } from '../types/errorGenerator';

export const ERROR_DEFAULTS = {
    [ErrorType.ERROR]: 'Demo Error: generic error',
    [ErrorType.TYPE_ERROR]: 'Demo TypeError: accessing property of undefined',
    [ErrorType.REFERENCE_ERROR]: 'Demo ReferenceError: variable is not defined',
    [ErrorType.RANGE_ERROR]: 'Demo RangeError: array length invalid',
    [ErrorType.SYNTAX_ERROR]: 'Demo SyntaxError: invalid syntax',
    [ErrorType.EVAL_ERROR]: 'Demo EvalError: eval function error',
    [ErrorType.URI_ERROR]: 'Demo URIError: malformed URI',
    [ErrorType.AGGREGATE_ERROR]: 'Demo AggregateError: multiple errors occurred'
} as const;

/**
 * Generates a base Error
 */
export function generateBaseError(customMessage?: string): void {
    throw new Error(customMessage || ERROR_DEFAULTS[ErrorType.ERROR]);
}

/**
 * Generates a TypeError by accessing a property on undefined
 */
export function generateTypeError(_customMessage?: string): void {
    const obj: any = undefined;
    obj.property;
}

/**
 * Generates a ReferenceError by accessing an undefined variable
 */
export function generateReferenceError(_customMessage?: string): void {
    // @ts-ignore - intentionally accessing undefined variable
    nonExistentVariable.toString();
}

/**
 * Generates a RangeError by creating an invalid array
 */
export function generateRangeError(_customMessage?: string): void {
    new Array(-1);
}

/**
 * Generates a SyntaxError using eval
 */
export function generateSyntaxError(_customMessage?: string): void {
    eval('invalid syntax here {{{');
}

/**
 * Generates an EvalError
 */
export function generateEvalError(customMessage?: string): void {
    throw new EvalError(customMessage || ERROR_DEFAULTS[ErrorType.EVAL_ERROR]);
}

/**
 * Generates a URIError by decoding a malformed URI component
 */
export function generateURIError(_customMessage?: string): void {
    decodeURIComponent('%');
}

/**
 * Generates an AggregateError with multiple sub-errors
 */
export function generateAggregateError(customMessage?: string): void {
    throw new AggregateError(
        [new Error('sub-error 1'), new TypeError('sub-error 2')],
        customMessage || ERROR_DEFAULTS[ErrorType.AGGREGATE_ERROR]
    );
}

/**
 * Generates an error based on the error type
 */
export function generateError(type: ErrorType, customMessage?: string): void {
    switch (type) {
        case ErrorType.ERROR:
            generateBaseError(customMessage);
            break;
        case ErrorType.TYPE_ERROR:
            generateTypeError(customMessage);
            break;
        case ErrorType.REFERENCE_ERROR:
            generateReferenceError(customMessage);
            break;
        case ErrorType.RANGE_ERROR:
            generateRangeError(customMessage);
            break;
        case ErrorType.SYNTAX_ERROR:
            generateSyntaxError(customMessage);
            break;
        case ErrorType.EVAL_ERROR:
            generateEvalError(customMessage);
            break;
        case ErrorType.URI_ERROR:
            generateURIError(customMessage);
            break;
        case ErrorType.AGGREGATE_ERROR:
            generateAggregateError(customMessage);
            break;
    }
}
