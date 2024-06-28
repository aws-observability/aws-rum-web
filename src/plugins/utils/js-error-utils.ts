import * as StackTrace from 'stacktrace-js';
import { JSErrorEvent } from '../../events/js-error-event';
import { SourceMapsFetchFunction } from '../../orchestration/Orchestration';

/**
 * Global error object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
 */
interface Error {
    message?: string;
    name?: string;
    description?: string; // non-standard Microsoft property
    // eslint-disable-next-line id-denylist
    number?: number; // non-standard Microsoft property
    fileName?: string; // non-standard Mozilla property
    lineNumber?: number; // non-standard Mozilla property
    columnNumber?: number; // non-standard Mozilla property
    stack?: string; // non-standard Mozilla and Chrome property
}

const isObject = (error: any): boolean => {
    const type = typeof error;
    return (type === 'object' || type === 'function') && !!error;
};

const buildBaseJsErrorEvent = (errorEvent: ErrorEvent): JSErrorEvent => {
    const rumEvent: JSErrorEvent = {
        version: '1.0.0',
        type: 'undefined',
        message: 'undefined'
    };
    if (errorEvent.type !== undefined) {
        rumEvent.type = errorEvent.type;
    }
    if (errorEvent.message !== undefined) {
        rumEvent.message = errorEvent.message;
    }
    if (errorEvent.filename !== undefined) {
        rumEvent.filename = errorEvent.filename;
    }
    if (errorEvent.lineno !== undefined) {
        rumEvent.lineno = errorEvent.lineno;
    }
    if (errorEvent.colno !== undefined) {
        rumEvent.colno = errorEvent.colno;
    }
    return rumEvent;
};

const appendErrorPrimitiveDetails = (
    rumEvent: JSErrorEvent,
    error: any
): void => {
    // Keep unhandledrejection as type as it will write to rumEvent.message
    if (rumEvent.type !== 'unhandledrejection') {
        rumEvent.type = error.toString();
    }
    rumEvent.message = error.toString();
};

const appendErrorSourceMaps = async (
    error: globalThis.Error,
    fetchFunction?: SourceMapsFetchFunction
) => {
    if (error && error.stack) {
        try {
            const stackFrames = await StackTrace.fromError(error, {
                ajax: fetchFunction
            } as StackTrace.StackTraceOptions);
            error.stack = stackFrames.join(' \n ');
            console.log('appendErrorSourceMaps done');
            console.log(error.stack);
        } catch (e) {
            error.stack = `Parsing stack failed: ${e} \n ${error.stack}`;
            console.log('appendErrorSourceMaps error');
            console.log(error.stack);
        }
    }
};

const appendErrorObjectDetails = async (
    rumEvent: JSErrorEvent,
    error: Error,
    stackTraceLength: number,
    sourceMapsEnabled?: boolean,
    sourceMapsFetchFunction?: SourceMapsFetchFunction
): Promise<void> => {
    if (sourceMapsEnabled) {
        await appendErrorSourceMaps(
            error as globalThis.Error,
            sourceMapsFetchFunction
        );
    }
    // error may extend Error here, but it is not guaranteed (i.e., it could
    // be any object)
    if (error.name) {
        rumEvent.type = error.name;
    }
    if (error.message) {
        rumEvent.message = error.message;
    }
    if (error.fileName) {
        rumEvent.filename = error.fileName;
    }
    if (error.lineNumber) {
        rumEvent.lineno = error.lineNumber;
    }
    if (error.columnNumber) {
        rumEvent.colno = error.columnNumber;
    }
    if (stackTraceLength && error.stack) {
        rumEvent.stack =
            error.stack.length > stackTraceLength
                ? error.stack.substring(0, stackTraceLength) + '...'
                : error.stack;
    }
};

export const isErrorPrimitive = (error: any): boolean => {
    return error !== Object(error) && error !== undefined && error !== null;
};

export const errorEventToJsErrorEvent = async (
    errorEvent: ErrorEvent,
    stackTraceLength: number,
    sourceMapsEnabled?: boolean,
    sourceMapsFetchFunction?: SourceMapsFetchFunction
): Promise<JSErrorEvent> => {
    const rumEvent: JSErrorEvent = buildBaseJsErrorEvent(errorEvent);
    const error = errorEvent.error;
    if (isObject(error)) {
        await appendErrorObjectDetails(
            rumEvent,
            error,
            stackTraceLength,
            sourceMapsEnabled,
            sourceMapsFetchFunction
        );
    } else if (isErrorPrimitive(error)) {
        appendErrorPrimitiveDetails(rumEvent, error);
    }
    return rumEvent;
};
