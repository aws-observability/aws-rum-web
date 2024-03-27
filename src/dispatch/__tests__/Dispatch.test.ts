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

describe('Dispatch tests', () => {
    beforeEach(() => {
        sendFetch.mockClear();
        sendBeacon.mockClear();

        (DataPlaneClient as any).mockImplementation(() => {
            return {
                sendFetch,
                sendBeacon
            };
        });
    });

    test('dispatch() sends data through client', async () => {
        // Init
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const sendFetch = jest.fn(() =>
            Promise.reject('Something went wrong.')
        );
        (DataPlaneClient as any).mockImplementation(() => {
            return {
                sendFetch
            };
        });

        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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

    test('when visibilitychange event is triggered then beacon dispatch runs', async () => {
        // Init
        const dispatch = new Dispatch(
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

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).toHaveBeenCalled();
    });

    test('when useBeacon is false then visibilitychange uses fetch dispatch', async () => {
        // Init
        const dispatch = new Dispatch(
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1, useBeacon: false }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).not.toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('when useBeacon is false then pagehide uses fetch dispatch', async () => {
        // Init
        const dispatch = new Dispatch(
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...DEFAULT_CONFIG,
                ...{ dispatchInterval: 1, useBeacon: false }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('pagehide'));

        // Assert
        expect(sendBeacon).not.toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('when plugin is disabled then beacon dispatch does not run', async () => {
        // Init
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
        (DataPlaneClient as any).mockImplementationOnce(() => ({
            sendFetch: () => Promise.reject(new Error('429'))
        }));

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        const dispatch = new Dispatch(
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
        (DataPlaneClient as any).mockImplementationOnce(() => ({
            sendFetch: () => Promise.reject(new Error('500'))
        }));

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        const dispatch = new Dispatch(
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

    test('when a fetch request is rejected with 401 then dispatch is disabled', async () => {
        // Init
        (DataPlaneClient as any).mockImplementationOnce(() => ({
            sendFetch: () => Promise.reject(new Error('401'))
        }));

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        const dispatch = new Dispatch(
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
            new Error('401')
        );
        expect((dispatch as unknown as any).enabled).toBe(false);
    });

    test('when a fetch request is rejected with 403 then dispatch is disabled', async () => {
        // Init
        (DataPlaneClient as any).mockImplementationOnce(() => ({
            sendFetch: () => Promise.reject(new Error('403'))
        }));

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        const dispatch = new Dispatch(
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
        (DataPlaneClient as any).mockImplementationOnce(() => ({
            sendFetch: () => Promise.reject(new Error('404'))
        }));

        const eventCache: EventCache =
            Utils.createDefaultEventCacheWithEvents();

        const dispatch = new Dispatch(
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
        const dispatch = new Dispatch(
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
});
