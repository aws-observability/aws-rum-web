import { ErrorType } from '../types/errorGenerator';

export const ERROR_DEFAULTS = {
    [ErrorType.TYPE_ERROR]: 'Demo TypeError: accessing property of undefined',
    [ErrorType.REFERENCE_ERROR]: 'Demo ReferenceError: variable is not defined',
    [ErrorType.RANGE_ERROR]: 'Demo RangeError: array length invalid',
    [ErrorType.SYNTAX_ERROR]: 'Demo SyntaxError: invalid syntax',
    [ErrorType.PROMISE_REJECTION]:
        'Demo Promise Rejection: unhandled rejection',
    [ErrorType.SETTIMEOUT_ERROR]: 'Demo SetTimeout Error: error in timeout',
    [ErrorType.ASYNC_AWAIT_ERROR]:
        'Demo Async/Await Error: error in async function'
} as const;

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
 * Generates an unhandled Promise rejection
 */
export function generatePromiseRejection(customMessage?: string): void {
    Promise.reject(
        new Error(customMessage || ERROR_DEFAULTS[ErrorType.PROMISE_REJECTION])
    );
}

/**
 * Generates an error inside setTimeout
 */
export function generateSetTimeoutError(customMessage?: string): void {
    setTimeout(() => {
        throw new Error(
            customMessage || ERROR_DEFAULTS[ErrorType.SETTIMEOUT_ERROR]
        );
    }, 0);
}

/**
 * Generates an error in an async function
 */
export async function generateAsyncAwaitError(
    customMessage?: string
): Promise<void> {
    throw new Error(
        customMessage || ERROR_DEFAULTS[ErrorType.ASYNC_AWAIT_ERROR]
    );
}

/**
 * Generates an error based on the error type
 */
export function generateError(type: ErrorType, customMessage?: string): void {
    switch (type) {
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
        case ErrorType.PROMISE_REJECTION:
            generatePromiseRejection(customMessage);
            break;
        case ErrorType.SETTIMEOUT_ERROR:
            generateSetTimeoutError(customMessage);
            break;
        case ErrorType.ASYNC_AWAIT_ERROR:
            generateAsyncAwaitError(customMessage);
            break;
    }
}
