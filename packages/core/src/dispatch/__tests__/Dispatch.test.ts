import { Dispatch } from '../Dispatch';
import * as Utils from '../../test-utils/test-utils';
import { DataPlaneClient } from '../DataPlaneClient';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { EventCache } from '../../event-cache/EventCache';
import { CRED_KEY, IDENTITY_KEY } from '../../utils/constants';
import { BasicAuthentication } from '../BasicAuthentication';
import { EnhancedAuthentication } from '../EnhancedAuthentication';

global.fetch = mockFetch;
const sendFetch = jest.fn(() => Promise.resolve());
const sendBeacon = jest.fn(() => Promise.resolve());
jest.mock('../DataPlaneClient', () => ({
    DataPlaneClient: jest
        .fn()
        .mockImplementation(() => ({ sendFetch, sendBeacon }))
}));

const mockBasicAuthProvider = jest.fn();
const mockEnhancedAuthProvider = jest.fn();

jest.mock('../BasicAuthentication', () => ({
    BasicAuthentication: jest.fn().mockImplementation(() => ({
        ChainAnonymousCredentialsProvider: mockBasicAuthProvider
    }))
}));

jest.mock('../EnhancedAuthentication', () => ({
    EnhancedAuthentication: jest.fn().mockImplementation(() => ({
        ChainAnonymousCredentialsProvider: mockEnhancedAuthProvider
    }))
}));

let visibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState
});

describe('Dispatch tests', () => {
    let dispatch: Dispatch;

    beforeEach(() => {
        sendFetch.mockClear();
        sendBeacon.mockClear();
        visibilityState = 'visible';
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clear all event listeners to visibilitychange and pagehide
        // to avoid polluting sendFetch and sendBeacon
        dispatch.stopDispatchTimer();
    });

    test('dispatch() sends data through client', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await expect(dispatch.dispatchFetch()).resolves.toBe(undefined);

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('when CredentialProvider is used then credentials are immediately fetched', async () => {
        // Init
        const credentialProvider: AwsCredentialIdentityProvider = jest.fn();
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );

        // Run
        dispatch.setAwsCredentials(credentialProvider);

        // Assert
        expect(credentialProvider).toHaveBeenCalledTimes(1);
    });

    test('dispatch() throws exception when send fails', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject('Something went wrong.')
        );

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            'Something went wrong.'
        );
    });

    test('dispatch() does nothing when disabled', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        dispatch.disable();
        await dispatch.dispatchFetch();

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(0);
    });

    test('dispatch() sends when disabled then enabled', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        dispatch.disable();
        dispatch.enable();
        await dispatch.dispatchFetch();

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('dispatch() automatically dispatches when interval > 0', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('dispatch() does not automatically  dispatch when interval = 0', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() does not automatically  dispatch when interval < 0', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: -1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() does not automatically dispatch when dispatch is disabled', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.disable();

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() resumes when disabled and enabled', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.disable();
        dispatch.enable();

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('ON visibilitychange and WHEN useBeacon is false THEN flush event batch with sendFetch', async () => {
        // Init
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: false
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendFetch).toHaveBeenCalled();
        expect(sendBeacon).not.toHaveBeenCalled();
        expect(getEventBatch).toHaveBeenCalledWith(true);
    });

    test('ON visibilitychange and WHEN useBeacon is true THEN flush event batch with sendBeacon', async () => {
        // Init
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: true
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
        expect(getEventBatch).toHaveBeenCalledWith(true);
    });

    test('ON pagehide and WHEN useBeacon is false THEN flush event batch with sendFetch', async () => {
        // Init
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: false
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('pagehide'));

        // Assert
        expect(sendBeacon).not.toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
        expect(getEventBatch).toHaveBeenCalledWith(true);
    });

    test('ON pagehide and WHEN useBeacon is true THEN flush event batch with sendBeacon', async () => {
        // Init
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: true
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('pagehide'));

        // Assert
        expect(sendFetch).not.toHaveBeenCalled();
        expect(sendBeacon).toHaveBeenCalled();
        expect(getEventBatch).toHaveBeenCalledWith(true);
    });

    test('WHEN flush with useBeacon fails THEN use fetch', async () => {
        // Init
        sendBeacon.mockImplementationOnce(() => Promise.reject());
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: true
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('pagehide'));

        // Wait for promises to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Assert
        expect(getEventBatch).toHaveBeenCalledWith(true);
        expect(sendBeacon).toHaveBeenCalled();

        // Wait for sendBeacon promise to resolve
        await new Promise((resolve) => setTimeout(resolve));
        expect(sendFetch).toHaveBeenCalled();
    });

    test('WHEN flush with fetch fails THEN use sendBeacon', async () => {
        // Init
        sendFetch.mockImplementationOnce(() => Promise.reject());
        visibilityState = 'hidden';
        const eventCache = Utils.createDefaultEventCacheWithEvents();
        const getEventBatch = jest.spyOn(eventCache, 'getEventBatch');
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                dispatchInterval: Number.MAX_SAFE_INTEGER,
                useBeacon: false
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('pagehide'));

        // Wait for promises to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Assert
        expect(getEventBatch).toHaveBeenCalledWith(true);
        expect(sendFetch).toHaveBeenCalled();

        // Wait for sendFetch promise to resolve
        await new Promise((resolve) => setTimeout(resolve));
        expect(sendBeacon).toHaveBeenCalled();
    });

    test('when plugin is disabled then beacon dispatch does not run', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();
        dispatch.disable();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).not.toHaveBeenCalled();
    });

    test('when dispatch does not have AWS credentials then dispatchFetch throws an error', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 0, signing: true }
            }
        );

        // Run and Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('CWR: Cannot dispatch; no AWS credentials.')
        );
    });

    test('when dispatch does not have AWS credentials then dispatchBeacon throws an error', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 0 }
            }
        );

        // Run and Assert
        await expect(dispatch.dispatchBeacon()).rejects.toEqual(
            new Error('CWR: Cannot dispatch; no AWS credentials.')
        );
    });

    test('when dispatch does not have AWS credentials then dispatchFetchFailSilent fails silently', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );

        // Run and Assert
        await expect(dispatch.dispatchFetchFailSilent()).resolves.toEqual(
            undefined
        );
    });

    test('when dispatch does not have AWS credentials then dispatchBeaconFailSilent fails silently', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1 }
            }
        );

        // Run and Assert
        await expect(dispatch.dispatchBeaconFailSilent()).resolves.toEqual(
            undefined
        );
    });

    test('when a fetch request is rejected with 429 then dispatch is NOT disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('429'))
        );

        const eventCache = Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, retries: 0 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('429')
        );
        expect((dispatch as unknown as any).enabled).toBe(true);
    });

    test('when a fetch request is rejected with 500 then dispatch is NOT disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('500'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, retries: 0 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('500')
        );
        expect((dispatch as unknown as any).enabled).toBe(true);
    });

    test('when a fetch request is rejected with 403 then dispatch is disabled ONLY after rebuilding the dataplane client', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('403'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, retries: 0 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        const client1 = (dispatch as unknown as any).rum as DataPlaneClient;
        const forceRebuildClientSpy = jest.spyOn(
            dispatch as unknown as any,
            'forceRebuildClient'
        );

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('403')
        );
        // dispatch should not be disabled on the first 403
        expect((dispatch as unknown as any).enabled).toBe(true);

        // the client should have been rebuilt
        const client2 = (dispatch as unknown as any).rum as DataPlaneClient;
        expect(client1).not.toBe(client2);
        expect(forceRebuildClientSpy).toHaveBeenCalledTimes(1);

        // dispatch should be disabled on the second 403
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('403'))
        );
        eventCache.recordEvent('com.amazon.rum.event1', {});
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('403')
        );
        expect((dispatch as unknown as any).enabled).toBe(false);
    });

    test('when forceRebuildClient is called, then credentials in local storage are reset and setCognitoCredentials is called', async () => {
        // Init
        const mockCredentialProvider = Utils.createAwsCredentials();
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
        const setCognitoCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setCognitoCredentials'
        );

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    identityPoolId:
                        'us-west-2:12345678-1234-1234-1234-123456789012',
                    guestRoleArn: 'arn:aws:iam::123456789012:role/TestRole'
                }
            }
        );
        dispatch.setAwsCredentials(mockCredentialProvider);

        // Run
        (dispatch as any).forceRebuildClient();

        // Assert
        expect(removeItemSpy).toHaveBeenCalledWith(CRED_KEY);
        expect(removeItemSpy).toHaveBeenCalledWith(IDENTITY_KEY);
        expect(setCognitoCredentialsSpy).toHaveBeenCalledWith(
            'us-west-2:12345678-1234-1234-1234-123456789012',
            'arn:aws:iam::123456789012:role/TestRole'
        );

        removeItemSpy.mockRestore();
        setCognitoCredentialsSpy.mockRestore();
    });

    test('when setCognitoCredentials is called and guestRoleArn exists, then basic authentication is used', async () => {
        // Init
        const setAwsCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setAwsCredentials'
        );
        const config = {
            ...DEFAULT_CONFIG,
            ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
        };

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            config
        );

        // Run
        dispatch.setCognitoCredentials(
            'us-west-2:12345678-1234-1234-1234-123456789012',
            'arn:aws:iam::123456789012:role/TestRole'
        );

        // Assert
        expect(BasicAuthentication).toHaveBeenCalledWith(
            config,
            Utils.APPLICATION_ID
        );
        expect(EnhancedAuthentication).not.toHaveBeenCalled();
        expect(setAwsCredentialsSpy).toHaveBeenCalledWith(
            mockBasicAuthProvider
        );

        setAwsCredentialsSpy.mockRestore();
    });

    test('when setCognitoCredentials is called and guestRoleArn does not exist, then enhanced authentication is used', async () => {
        // Init
        const setAwsCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setAwsCredentials'
        );
        const config = {
            ...DEFAULT_CONFIG,
            ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
        };

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            config
        );

        // Run
        dispatch.setCognitoCredentials(
            'us-west-2:12345678-1234-1234-1234-123456789012'
        );

        // Assert
        expect(EnhancedAuthentication).toHaveBeenCalledWith(
            config,
            Utils.APPLICATION_ID
        );
        expect(BasicAuthentication).not.toHaveBeenCalled();
        expect(setAwsCredentialsSpy).toHaveBeenCalledWith(
            mockEnhancedAuthProvider
        );

        setAwsCredentialsSpy.mockRestore();
    });

    test('when forceRebuildClient is called and unique cookies are enabled, then unique storage keys are used', async () => {
        // Init
        const mockCredentialProvider = Utils.createAwsCredentials();
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
        const setCognitoCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setCognitoCredentials'
        );

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    identityPoolId:
                        'us-west-2:12345678-1234-1234-1234-123456789012',
                    guestRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
                    cookieAttributes: {
                        ...DEFAULT_CONFIG.cookieAttributes,
                        unique: true
                    }
                }
            }
        );
        dispatch.setAwsCredentials(mockCredentialProvider);

        // Run
        (dispatch as any).forceRebuildClient();

        // Assert
        expect(removeItemSpy).toHaveBeenCalledWith(
            `${CRED_KEY}_${Utils.APPLICATION_ID}`
        );
        expect(removeItemSpy).toHaveBeenCalledWith(
            `${IDENTITY_KEY}_${Utils.APPLICATION_ID}`
        );
        expect(setCognitoCredentialsSpy).toHaveBeenCalledWith(
            'us-west-2:12345678-1234-1234-1234-123456789012',
            'arn:aws:iam::123456789012:role/TestRole'
        );

        removeItemSpy.mockRestore();
        setCognitoCredentialsSpy.mockRestore();
    });

    test('when forceRebuildClient is called and cognito is not enabled but credentialProvider was set, then client is rebuilt with credentialProvider', async () => {
        // Init
        const mockCredentialProvider = Utils.createAwsCredentials();
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
        const setAwsCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setAwsCredentials'
        );
        const setCognitoCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setCognitoCredentials'
        );

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF
                    // No identityPoolId - cognito not enabled
                }
            }
        );
        dispatch.setAwsCredentials(mockCredentialProvider);

        // Run
        (dispatch as any).forceRebuildClient();

        // Assert
        expect(removeItemSpy).toHaveBeenCalledWith(CRED_KEY);
        expect(setCognitoCredentialsSpy).not.toHaveBeenCalled();
        expect(setAwsCredentialsSpy).toHaveBeenCalledWith(
            mockCredentialProvider
        );

        removeItemSpy.mockRestore();
        setAwsCredentialsSpy.mockRestore();
        setCognitoCredentialsSpy.mockRestore();
    });

    test('when forceRebuildClient is called and cognito is not enabled and credentialProvider was not set, then only credentials are cleared', async () => {
        // Init
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
        const setAwsCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setAwsCredentials'
        );
        const setCognitoCredentialsSpy = jest.spyOn(
            Dispatch.prototype,
            'setCognitoCredentials'
        );

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF
                    // No identityPoolId - cognito not enabled
                }
            }
        );
        // Do NOT call setAwsCredentials

        // Run
        (dispatch as any).forceRebuildClient();

        // Assert
        expect(removeItemSpy).toHaveBeenCalledWith(CRED_KEY);
        expect(setCognitoCredentialsSpy).not.toHaveBeenCalled();
        expect(setAwsCredentialsSpy).not.toHaveBeenCalled();

        removeItemSpy.mockRestore();
        setAwsCredentialsSpy.mockRestore();
        setCognitoCredentialsSpy.mockRestore();
    });

    test('when a fetch request is rejected with 403 and signing is disabled, then dispatch is disabled immediately', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('403'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    retries: 0,
                    signing: false
                }
            }
        );

        const forceRebuildClientSpy = jest.spyOn(
            dispatch as unknown as any,
            'forceRebuildClient'
        );

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('403')
        );
        // dispatch should be disabled immediately when signing is disabled
        expect((dispatch as unknown as any).enabled).toBe(false);
        // forceRebuildClient should not be called when signing is disabled
        expect(forceRebuildClientSpy).not.toHaveBeenCalled();

        forceRebuildClientSpy.mockRestore();
    });

    test('when a fetch request is successful after rebuilding the dataplane client, then dispatch is not disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('403'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, retries: 0 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        const client1 = (dispatch as unknown as any).rum as DataPlaneClient;

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('403')
        );
        // dispatch should not be disabled on the first 403
        expect((dispatch as unknown as any).enabled).toBe(true);

        // the client should have been rebuilt
        const client2 = (dispatch as unknown as any).rum as DataPlaneClient;
        expect(client1).not.toBe(client2);

        // dispatch should not be disabled if credentials are fixed
        sendFetch.mockImplementationOnce(() => Promise.resolve());
        eventCache.recordEvent('com.amazon.rum.event1', {});
        dispatch.dispatchFetch();
        expect((dispatch as unknown as any).enabled).toBe(true);
    });

    test('when a fetch request is rejected with 404 then dispatch is disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('404'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            eventCache,
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, retries: 0 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        eventCache.recordEvent('com.amazon.rum.event1', {});

        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            new Error('404')
        );
        expect((dispatch as unknown as any).enabled).toBe(false);
    });

    test('when signing is disabled then credentials are not needed for dispatch', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF, signing: false }
            }
        );

        // Run
        await expect(dispatch.dispatchFetch()).resolves.toBe(undefined);

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('When valid alias is provided then PutRumEvents request containing alias is sent', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    signing: false,
                    alias: 'test123'
                }
            }
        );

        // Run
        await expect(dispatch.dispatchFetch()).resolves.toBe(undefined);

        // Assert
        expect(dispatch['createRequest']()['Alias']).toBeDefined();
        expect(dispatch['createRequest']()['Alias']).toBe('test123');

        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('When no alias is provided then PutRumEvents request does not contain an alias', async () => {
        // Init
        dispatch = new Dispatch(
            Utils.APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    signing: false
                }
            }
        );

        // Run
        await expect(dispatch.dispatchFetch()).resolves.toBe(undefined);

        // Assert

        expect(dispatch['createRequest']()['Alias']).toBeUndefined();

        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    describe('clientBuilder', () => {
        test('when custom clientBuilder is provided then compressionStrategy is passed', async () => {
            const mockClientBuilder = jest.fn().mockReturnValue({
                sendFetch: jest.fn().mockResolvedValue({}),
                sendBeacon: jest.fn().mockResolvedValue({})
            });

            dispatch = new Dispatch(
                Utils.APPLICATION_ID,
                Utils.AWS_RUM_REGION,
                Utils.AWS_RUM_ENDPOINT,
                Utils.createDefaultEventCacheWithEvents(),
                {
                    ...DEFAULT_CONFIG,
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    clientBuilder: mockClientBuilder,
                    compressionStrategy: { enabled: true }
                }
            );
            dispatch.setAwsCredentials(Utils.createAwsCredentials());

            expect(mockClientBuilder).toHaveBeenCalledWith(
                Utils.AWS_RUM_ENDPOINT,
                Utils.AWS_RUM_REGION,
                expect.anything(),
                { enabled: true }
            );
        });

        test('when custom clientBuilder is provided with compression disabled then compressionStrategy is passed as disabled', async () => {
            const mockClientBuilder = jest.fn().mockReturnValue({
                sendFetch: jest.fn().mockResolvedValue({}),
                sendBeacon: jest.fn().mockResolvedValue({})
            });

            dispatch = new Dispatch(
                Utils.APPLICATION_ID,
                Utils.AWS_RUM_REGION,
                Utils.AWS_RUM_ENDPOINT,
                Utils.createDefaultEventCacheWithEvents(),
                {
                    ...DEFAULT_CONFIG,
                    dispatchInterval: Utils.AUTO_DISPATCH_OFF,
                    clientBuilder: mockClientBuilder,
                    compressionStrategy: { enabled: false }
                }
            );
            dispatch.setAwsCredentials(Utils.createAwsCredentials());

            expect(mockClientBuilder).toHaveBeenCalledWith(
                Utils.AWS_RUM_ENDPOINT,
                Utils.AWS_RUM_REGION,
                expect.anything(),
                { enabled: false }
            );
        });
    });
});
