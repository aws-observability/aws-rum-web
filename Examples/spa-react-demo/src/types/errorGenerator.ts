export type ErrorType =
    | 'TypeError'
    | 'ReferenceError'
    | 'RangeError'
    | 'SyntaxError'
    | 'PromiseRejection'
    | 'SetTimeoutError'
    | 'AsyncAwaitError';

export const ErrorType = {
    TYPE_ERROR: 'TypeError' as ErrorType,
    REFERENCE_ERROR: 'ReferenceError' as ErrorType,
    RANGE_ERROR: 'RangeError' as ErrorType,
    SYNTAX_ERROR: 'SyntaxError' as ErrorType,
    PROMISE_REJECTION: 'PromiseRejection' as ErrorType,
    SETTIMEOUT_ERROR: 'SetTimeoutError' as ErrorType,
    ASYNC_AWAIT_ERROR: 'AsyncAwaitError' as ErrorType
};

export interface ErrorQueueItem {
    type: ErrorType;
    message: string;
}

export interface ErrorGeneratorState {
    selectedTypes: ErrorType[];
    customMessage: string;
    repeatCount: number;
    delay: number;
    isGenerating: boolean;
    status: string;
}
