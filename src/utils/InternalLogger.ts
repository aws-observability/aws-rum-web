const unknownCaller = '[aws-rum-web:unknown.unknown]';
export class InternalLogger {
    private static debugEnabled = false;

    static configure(debug: boolean): void {
        InternalLogger.debugEnabled = debug;
    }

    private static getCallerInfo(): string {
        try {
            const stack = new Error().stack;
            if (!stack) {
                return unknownCaller;
            }

            const lines = stack.split('\n');
            if (lines.length < 4) {
                return unknownCaller;
            }

            // Skip Error, getCallerInfo, and the logger method itself
            const callerLine = lines[3];
            if (!callerLine) {
                return unknownCaller;
            }

            // Extract class and method name from stack trace
            const match = callerLine.match(/at (?:(.+?)\s+\()?/);
            if (match && match.length >= 2) {
                const fullName = match[1].trim();
                // Extract class.method format
                const parts = fullName.split('.');
                if (parts.length >= 2) {
                    const className = parts[parts.length - 2] ?? 'unknown';
                    const methodName = parts[parts.length - 1] ?? 'unknown';
                    return `[aws-rum-web:${className}.${methodName}]`;
                }
                return `[aws-rum-web:${fullName}]`;
            }
        } catch (_) {
            // do nothing
        }
        return unknownCaller;
    }

    static info(message: any, ...optionalParams: any[]): void {
        if (!InternalLogger.debugEnabled) {
            return;
        }
        const prefix = this.getCallerInfo();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.info(prefix, message, ...optionalParams);
    }

    static debug(message: any, ...optionalParams: any[]): void {
        if (!InternalLogger.debugEnabled) {
            return;
        }
        const prefix = this.getCallerInfo();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.debug(prefix, message, ...optionalParams);
    }

    static warn(message: any, ...optionalParams: any[]): void {
        if (!InternalLogger.debugEnabled) {
            return;
        }
        const prefix = this.getCallerInfo();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.warn(prefix, message, ...optionalParams);
    }

    static error(message: any, ...optionalParams: any[]): void {
        if (!InternalLogger.debugEnabled) {
            return;
        }
        const prefix = this.getCallerInfo();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.error(prefix, message, ...optionalParams);
    }
}
