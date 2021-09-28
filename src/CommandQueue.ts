import { CredentialProvider, Credentials } from '@aws-sdk/types';
import { PartialConfig, Orchestration } from './orchestration/Orchestration';

/**
 * An AWS RUM Client command.
 *
 * A command is one of the following:
 * - <'setAwsCredentials', AWS.Credentials>
 * - <'addPlugin', TelemetryPlugin>
 * - <'configurePlugin', object>
 */
export type Command = { c: string; p: any };

/**
 * The global configuration object is defined in the loader script, so we cannot trust its types.
 */
export type AwsRumClientInit = {
    q: [];
    n: string;
    i: string;
    a: string;
    r: string;
    v: string;
    c?: PartialConfig;
};

/**
 * A utility for collecting telemetry from JavaScript applications.
 *
 * For example:
 *  - Pages visited (user workflow)
 *  - Page load time
 *  - DOM events
 */
export class CommandQueue {
    private orchestration: Orchestration;

    private commandHandlerMap = {
        setAwsCredentials: (
            payload: Credentials | CredentialProvider
        ): void => {
            this.orchestration.setAwsCredentials(payload);
        },
        configurePlugin: (payload: any): void => {
            if (payload.pluginId && payload.config) {
                this.orchestration.configurePlugin(
                    payload.pluginId,
                    payload.config
                );
            } else {
                throw new Error('IncorrectParametersException');
            }
        },
        recordPageView: (payload: string): void => {
            this.orchestration.recordPageView(payload);
        },
        recordError: (payload: any): void => {
            this.orchestration.recordError(payload);
        },
        dispatch: (): void => {
            this.orchestration.dispatch();
        },
        dispatchBeacon: (): void => {
            this.orchestration.dispatchBeacon();
        },
        enable: (): void => {
            this.orchestration.enable();
        },
        disable: (): void => {
            this.orchestration.disable();
        },
        allowCookies: (allow: boolean): void => {
            if (typeof allow === 'boolean') {
                this.orchestration.allowCookies(allow);
            } else {
                throw new Error('IncorrectParametersException');
            }
        }
    };

    constructor(awsRum: AwsRumClientInit) {
        this.orchestration = new Orchestration(
            awsRum.i,
            awsRum.a,
            awsRum.v,
            awsRum.r,
            awsRum.c
        );

        // Overwrite the global API to use CommandQueue
        // @ts-ignore
        window[awsRum.n] = (c: string, p: any) => {
            this.push({ c, p });
        };

        // Execute any queued commands
        awsRum.q.forEach((command: Command) => {
            this.push(command);
        });

        // Release the original queue
        awsRum.q = [];
    }

    /**
     * Add a command to the command queue.
     */
    async push(command: Command) {
        // @ts-ignore
        const commandHandler = await this.commandHandlerMap[command.c];
        if (commandHandler) {
            commandHandler(command.p);
        } else {
            throw new Error(`UnsupportedOperationException: ${command.c}`);
        }
    }
}
