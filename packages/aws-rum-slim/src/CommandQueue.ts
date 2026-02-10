import { INSTALL_SCRIPT } from '@aws-rum-web/core/utils/constants';
import { PartialConfig, Orchestration } from './orchestration/Orchestration';

export type CommandFunction = (payload?: any) => void;

interface CommandFunctions {
    addSessionAttributes: CommandFunction;
    recordPageView: CommandFunction;
    recordError: CommandFunction;
    registerDomEvents: CommandFunction;
    recordEvent: CommandFunction;
    dispatch: CommandFunction;
    dispatchBeacon: CommandFunction;
    enable: CommandFunction;
    disable: CommandFunction;
    allowCookies: CommandFunction;
}

export type Command = { c: string; p: any };

export type AwsRumClientInit = {
    q: [];
    n: string;
    i: string;
    a?: string;
    r: string;
    v: string;
    c?: PartialConfig;
    u?: string;
};

export class CommandQueue {
    private orchestration!: Orchestration;

    private commandHandlerMap: CommandFunctions = {
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
        recordEvent: (payload: any) => {
            if (
                typeof payload === 'object' &&
                typeof payload.type === 'string' &&
                typeof payload.data === 'object'
            ) {
                this.orchestration.recordEvent(payload.type, payload.data);
            } else {
                throw new Error('IncorrectParametersException');
            }
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

    public async init(awsRum: AwsRumClientInit): Promise<void> {
        this.initCwr(awsRum);
    }

    public async push(command: Command) {
        const commandHandler =
            this.commandHandlerMap[command.c as keyof CommandFunctions];
        if (commandHandler) {
            commandHandler(command.p);
        } else {
            throw new Error(`CWR: UnsupportedOperationException: ${command.c}`);
        }
    }

    private initCwr(awsRum: AwsRumClientInit) {
        if (awsRum.c) {
            awsRum.c.client = INSTALL_SCRIPT;
        } else {
            awsRum.c = { client: INSTALL_SCRIPT };
        }

        // Force signing off for slim distribution
        awsRum.c.signing = false;

        this.orchestration = new Orchestration(
            awsRum.i,
            awsRum.v,
            awsRum.r,
            awsRum.c
        );

        (window as any)[awsRum.n] = (c: string, p: any) => {
            this.push({ c, p });
        };

        awsRum.q.forEach((command: Command) => {
            this.push(command);
        });

        awsRum.q = [];
    }
}
