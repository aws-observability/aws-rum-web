export type ErrorType =
    | 'Error'
    | 'TypeError'
    | 'ReferenceError'
    | 'RangeError'
    | 'SyntaxError'
    | 'EvalError'
    | 'URIError'
    | 'AggregateError';

export const ErrorType = {
    ERROR: 'Error' as ErrorType,
    TYPE_ERROR: 'TypeError' as ErrorType,
    REFERENCE_ERROR: 'ReferenceError' as ErrorType,
    RANGE_ERROR: 'RangeError' as ErrorType,
    SYNTAX_ERROR: 'SyntaxError' as ErrorType,
    EVAL_ERROR: 'EvalError' as ErrorType,
    URI_ERROR: 'URIError' as ErrorType,
    AGGREGATE_ERROR: 'AggregateError' as ErrorType
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
