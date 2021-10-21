import { PartialConfig } from '../orchestration/Orchestration';

const IDENTITY_POOL_ID = 'us-west-2:a-b-c-d-e';
const ENDPOINT = 'https://dataplane.rum.us-west-2.amazonaws.com/';
const GUEST_ROLE_ARN =
    'arn:aws:iam::000000000000:role/CWR-Monitor-us-east-1-000000000000_Unauth_0000000000000';

export const dummyOtaConfigURL = './remote-config.json';

export const mockOtaConfigFile = {
    clientConfig: {
        identityPoolId: IDENTITY_POOL_ID,
        endpoint: ENDPOINT,
        guestRoleArn: GUEST_ROLE_ARN,
        sessionSampleRate: 1,
        enableRumClient: true,
        telemetries: ['errors', 'interaction'],
        sessionLengthSeconds: 1800,
        allowCookies: true
    }
};

export const mockOtaConfigObject: PartialConfig = {
    endpoint: ENDPOINT,
    identityPoolId: IDENTITY_POOL_ID,
    guestRoleArn: GUEST_ROLE_ARN,
    sessionSampleRate: 1,
    enableRumClient: true,
    telemetries: ['errors', 'interaction'],
    sessionLengthSeconds: 1800,
    allowCookies: true
};

export const mockPartialOtaConfigFile = {
    clientConfig: {
        endpoint: ENDPOINT,
        identityPoolId: IDENTITY_POOL_ID,
        guestRoleArn: GUEST_ROLE_ARN,
        // does not have session sample rate
        enableRumClient: true,
        telemetries: ['errors', 'interaction'],
        allowCookies: true
    }
};

export const mockPartialOtaConfigObject: PartialConfig = {
    endpoint: ENDPOINT,
    identityPoolId: IDENTITY_POOL_ID,
    guestRoleArn: GUEST_ROLE_ARN,
    // does not have session sample rate
    enableRumClient: true,
    allowCookies: true,
    telemetries: ['errors', 'interaction']
};
