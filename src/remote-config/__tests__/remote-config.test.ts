import { AwsRumClientInit } from '../../CommandQueue';
import {
    dummyOtaConfigURL,
    mockOtaConfigFile,
    mockOtaConfigObject
} from '../../test-utils/mock-remote-config';
import { PartialConfig } from '../../orchestration/Orchestration';
import { getRemoteConfig } from '../remote-config';
import { Response } from 'node-fetch';

const mockFetch = jest.fn();

global.fetch = mockFetch;

const getCodeConfig: AwsRumClientInit = {
    q: [],
    n: 'cwr',
    i: 'application_id',
    a: 'application_name',
    v: '1.0',
    r: 'us-west-2'
};

describe('OTA helper function tests', () => {
    test('when config is fetched then return config', async () => {
        (fetch as any).mockReturnValue(
            Promise.resolve(new Response(JSON.stringify(mockOtaConfigFile)))
        );

        // Init
        const getCodeConfig: AwsRumClientInit = {
            q: [],
            n: 'cwr',
            i: 'application_id',
            a: 'application_name',
            v: '1.0',
            r: 'us-west-2',
            c: undefined,
            u: dummyOtaConfigURL
        };

        const config: PartialConfig = await getRemoteConfig(getCodeConfig);
        expect(config).toEqual(mockOtaConfigObject);
    });

    test('when config is fetched then snippet config is preferred over remote config', async () => {
        (fetch as any).mockReturnValue(
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        clientConfig: {
                            sessionSampleRate: 0.1
                        }
                    })
                )
            )
        );

        // Init
        const getCodeConfig: AwsRumClientInit = {
            q: [],
            n: 'cwr',
            i: 'application_id',
            a: 'application_name',
            v: '1.0',
            r: 'us-west-2',
            c: {
                sessionSampleRate: 0.8
            },
            u: dummyOtaConfigURL
        };

        const config: PartialConfig = await getRemoteConfig(getCodeConfig);
        expect(config).toEqual(
            expect.objectContaining({
                sessionSampleRate: 0.8
            })
        );
    });

    test('when config is fetched then snippet config is merged with remote config', async () => {
        (fetch as any).mockReturnValue(
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        clientConfig: {
                            sessionSampleRate: 0.1
                        }
                    })
                )
            )
        );

        // Init
        const getCodeConfig: AwsRumClientInit = {
            q: [],
            n: 'cwr',
            i: 'application_id',
            a: 'application_name',
            v: '1.0',
            r: 'us-west-2',
            c: {
                dispatchInterval: 10 * 1000,
                telemetries: ['performance']
            },
            u: dummyOtaConfigURL
        };

        const config: PartialConfig = await getRemoteConfig(getCodeConfig);
        expect(config).toEqual(
            expect.objectContaining({
                dispatchInterval: 10 * 1000,
                sessionSampleRate: 0.1,
                telemetries: ['performance']
            })
        );
    });

    test('when remote config is empty then parameters from snippet are returned', async () => {
        (fetch as any).mockReturnValue(
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        clientConfig: {}
                    })
                )
            )
        );

        // Init
        const configObject = {
            ...getCodeConfig,
            c: {
                sessionSampleRate: 1,
                telemetries: ['performance']
            },
            u: dummyOtaConfigURL
        };

        const config: PartialConfig = await getRemoteConfig(configObject);
        expect(config).toEqual(
            expect.objectContaining({
                sessionSampleRate: 1,
                telemetries: ['performance']
            })
        );
    });
});
