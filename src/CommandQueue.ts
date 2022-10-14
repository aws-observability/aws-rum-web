import { CredentialProvider, Credentials } from '@aws-sdk/types';
import { PartialConfig, Orchestration } from './orchestration/Orchestration';
import { getRemoteConfig } from './remote-config/remote-config';

export type CommandFunction = (payload?: any) => void;

interface CommandFunctions {
    setAwsCredentials: CommandFunction;
    addSessionAttributes: CommandFunction;
    recordPageView: CommandFunction;
    recordError: CommandFunction;
    registerDomEvents: CommandFunction;
    dispatch: CommandFunction;
    dispatchBeacon: CommandFunction;
    enable: CommandFunction;
    disable: CommandFunction;
    allowCookies: CommandFunction;
}

/**
 * An AWS RUM Client command.
 */
export type Command = { c: string; p: any };

/**
 * The global configuration object is defined in the loader script, so we cannot trust its types.
 */
export type AwsRumClientInit = {
    q: [];
    n: string;
    i: string;
    a?: string; // deprecated
    r: string;
    v: string;
    c?: PartialConfig;
    u?: string;
};

/**
 * A utility for collecting telemetry from JavaScript applications.
 *
 * For example:
 * - Pages visited (user workflow)
 * - Page load time
 * - DOM events
 */
export class CommandQueue {
    private orchestration!: Orchestration;

    private commandHandlerMap: CommandFunctions = {
        setAwsCredentials: (
            payload: Credentials | CredentialProvider
        ): void => {
            this.orchestration.setAwsCredentials(payload);
        },
        addSessionAttributes: (payload: { [k: string]: any }): void => {
            this.orchestration.addSessionAttributes(payload);
        },
        recordPageView: (payload: any): void => {
            this.orchestration.recordPageView(payload);
        },
        recordError: (payload: any): void => {
            this.orchestration.recordError(payload);
        },
        registerDomEvents: (payload: any): void => {
            this.orchestration.registerDomEvents(payload);
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

    /**
     * Initialize CWR and execute commands which were queued before initialization.
     *
     * If a URL for a remote config file has been provided, the remote config
     * will first be fetched. If this attempt fails, an exception will be thrown
     * and CWR will not be initialized.
     *
     * @param awsRum The CWR application information and configuration options.
     */
    public async init(awsRum: AwsRumClientInit): Promise<void> {
        if (awsRum.u !== undefined) {
            // There is a remote config file -- fetch this file before initializing CWR.
            const config = await getRemoteConfig(awsRum);
            awsRum.c = config;
            this.initCwr(awsRum);
        } else {
            // Ther is no remote config file -- initialize CWR immediately.
            this.initCwr(awsRum);
        }
    }

    /**
     * Add a command to the command queue.
     */
    public async push(command: Command) {
        const commandHandler = this.commandHandlerMap[
            command.c as keyof CommandFunctions
        ];
        if (commandHandler) {
            commandHandler(command.p);
        } else {
            throw new Error(`CWR: UnsupportedOperationException: ${command.c}`);
        }
    }

    private initCwr(awsRum: AwsRumClientInit) {
        this.orchestration = new Orchestration(
            awsRum.i,
            awsRum.v,
            awsRum.r,
            awsRum.c
        );

        // Overwrite the global API to use CommandQueue
        (window as any)[awsRum.n] = (c: string, p: any) => {
            this.push({ c, p });
        };

        // Execute any queued commands
        awsRum.q.forEach((command: Command) => {
            this.push(command);
        });

        // Release the original queue
        awsRum.q = [];
    }
}
