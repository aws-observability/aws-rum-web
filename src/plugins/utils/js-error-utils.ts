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
    cause?: unknown; // ES2022 Error.cause property
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

const MAX_CAUSE_DEPTH = 5;

const buildCauseChain = (
    cause: unknown,
    stackTraceLength: number
): { type?: string; message?: string; stack?: string }[] => {
    const chain: { type?: string; message?: string; stack?: string }[] = [];
    const seen = new WeakSet();
    let current: unknown = cause;
    let depth = 0;

    while (
        current !== undefined &&
        current !== null &&
        depth < MAX_CAUSE_DEPTH
    ) {
        if (isObject(current)) {
            if (seen.has(current as object)) break;
            seen.add(current as object);
            const entry: { type?: string; message?: string; stack?: string } =
                {};
            const err = current as Error;
            if (err.name) {
                entry.type = err.name;
            }
            if (err.message) {
                entry.message = err.message;
            }
            if (stackTraceLength && err.stack) {
                entry.stack =
                    err.stack.length > stackTraceLength
                        ? err.stack.substring(0, stackTraceLength) + '...'
                        : err.stack;
            }
            // Fall back to stringified representation for plain objects
            // with no recognizable Error fields
            if (!entry.type && !entry.message && !entry.stack) {
                entry.message = String(current);
            }
            chain.push(entry);
            current = err.cause;
        } else if (isErrorPrimitive(current)) {
            chain.push({ message: String(current) });
            break;
        } else {
            break;
        }
        depth++;
    }

    return chain;
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
    if (error.cause !== undefined && error.cause !== null) {
        const causeChain = buildCauseChain(error.cause, stackTraceLength);
        if (causeChain.length > 0) {
            rumEvent.cause = causeChain;
        }
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
