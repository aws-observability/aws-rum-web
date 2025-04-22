import { Dispatch } from '../Dispatch';
import * as Utils from '../../test-utils/test-utils';
import { DataPlaneClient } from '../DataPlaneClient';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { EventCache } from 'event-cache/EventCache';

global.fetch = mockFetch;
const sendFetch = jest.fn(() => Promise.resolve());
const sendBeacon = jest.fn(() => Promise.resolve());
jest.mock('../DataPlaneClient', () => ({
    DataPlaneClient: jest
        .fn()
        .mockImplementation(() => ({ sendFetch, sendBeacon }))
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
    });

    afterEach(() => {
        // Clear all event listeners to visibilitychange and pagehide
        // to avoid polluting sendFetch and sendBeacon
        dispatch.stopDispatchTimer();
    });

    test('dispatch() sends data through client', async () => {
        // Init
        dispatch = new Dispatch(
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

    test('when a fetch request is rejected with 403 then dispatch is disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('403'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
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
            new Error('403')
        );
        expect((dispatch as unknown as any).enabled).toBe(false);
    });

    test('when a fetch request is rejected with 404 then dispatch is disabled', async () => {
        // Init
        sendFetch.mockImplementationOnce(() =>
            Promise.reject(new Error('404'))
        );

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        dispatch = new Dispatch(
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
});
