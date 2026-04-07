import { JSErrorEvent } from '../../events/js-error-event';

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

const appendErrorObjectDetails = (
    rumEvent: JSErrorEvent,
    error: Error,
    stackTraceLength: number
): void => {
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

export const errorEventToJsErrorEvent = (
    errorEvent: ErrorEvent,
    stackTraceLength: number
): JSErrorEvent => {
    const rumEvent: JSErrorEvent = buildBaseJsErrorEvent(errorEvent);
    const error = errorEvent.error;
    if (isObject(error)) {
        appendErrorObjectDetails(rumEvent, error, stackTraceLength);
    } else if (isErrorPrimitive(error)) {
        appendErrorPrimitiveDetails(rumEvent, error);
    }
    return rumEvent;
};
