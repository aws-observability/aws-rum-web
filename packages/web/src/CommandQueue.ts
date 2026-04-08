import { INSTALL_SCRIPT } from '@aws-rum/web-core/utils/constants';
import {
    CommandQueue as SlimCommandQueue,
    type AwsRumClientInit as SlimAwsRumClientInit
} from '@aws-rum/web-slim/CommandQueue';
import { PartialConfig } from './orchestration/config';
import { Orchestration } from './orchestration/Orchestration';
import { getRemoteConfig } from './remote-config/remote-config';

export type { Command, CommandFunction } from '@aws-rum/web-slim/CommandQueue';

/** Extends slim's init type to accept `telemetries` in the config. */
export type AwsRumClientInit = Omit<SlimAwsRumClientInit, 'c'> & {
    c?: PartialConfig;
};

/**
 * Full-featured CommandQueue extending slim with remote-config support.
 */
export class CommandQueue extends SlimCommandQueue {
    constructor() {
        super();
    }

    /**
     * Initialize CWR and execute commands which were queued before initialization.
     *
     * If a URL for a remote config file has been provided, the remote config
     * will first be fetched. If this attempt fails, an exception will be thrown
     * and CWR will not be initialized.
     */
    public async init(awsRum: AwsRumClientInit): Promise<void> {
        if (awsRum.u !== undefined) {
            // There is a remote config file -- fetch this file before initializing CWR.
            const config = await getRemoteConfig(awsRum);
            awsRum.c = config;
        }
        this.initCwr(awsRum);
    }

    protected initCwr(awsRum: AwsRumClientInit) {
        if (awsRum.c) {
            awsRum.c.client = INSTALL_SCRIPT;
        } else {
            awsRum.c = { client: INSTALL_SCRIPT };
        }

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
        awsRum.q.forEach((command) => {
            this.push(command);
        });

        // Release the original queue
        awsRum.q = [];
    }
}
