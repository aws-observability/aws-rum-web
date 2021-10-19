import { AwsRumClientInit as RemoteConfig } from '../CommandQueue';
import { PartialConfig } from '../orchestration/Orchestration';

export type FileConfig = {
    clientConfig?: ClientConfig;
};

type ClientConfig = {
    identityPoolId?: string;
    telemetries?: string[];
    enableRumClient?: boolean;
    sessionSampleRate?: number;
    guestRoleArn?: string;
    allowCookies?: boolean;
};

const fetchRemoteConfig = async (remoteUrl: string): Promise<FileConfig> => {
    try {
        const response = await fetch(remoteUrl, {
            mode: 'cors',
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    } catch (err) {
        throw new Error(`CWR: Failed to load remote config: ${err}`);
    }
};

export const getRemoteConfig = async (
    awsRum: RemoteConfig
): Promise<PartialConfig> => {
    let config: PartialConfig = {};
    let jsonConfig: FileConfig = {};

    if (awsRum.u !== undefined) {
        jsonConfig = await fetchRemoteConfig(awsRum.u);
        // When a config option is in both the snippet config and the remote
        // config, use the value in the snippet.
        config = { ...jsonConfig.clientConfig, ...awsRum.c };
    } else {
        if (awsRum.c !== undefined) {
            config = awsRum.c;
        }
    }
    return config;
};
