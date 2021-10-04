import { TELEMETRY_TYPES, Orchestration } from '../Orchestration';
import { Dispatch } from '../../dispatch/Dispatch';

// @ts-ignore
global.fetch = jest.fn();

jest.mock('../../dispatch/Dispatch', () => ({
    Dispatch: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../event-cache/EventCache', () => ({
    EventCache: jest.fn().mockImplementation(() => ({}))
}));

const addPlugin = jest.fn();

jest.mock('../../plugins/PluginManager', () => ({
    PluginManager: jest.fn().mockImplementation(() => ({
        addPlugin: addPlugin
    }))
}));

describe('Orchestration tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('when region is not provided then endpoint region defaults to us-west-2', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', undefined, {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(Dispatch.mock.calls[0][2]).toEqual(
            'https://dataplane.us-west-2.gamma.rum.aws.dev'
        );
    });

    test('when region is provided then the endpoint uses that region', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(Dispatch.mock.calls[0][2]).toEqual(
            'https://dataplane.us-east-1.gamma.rum.aws.dev'
        );
    });

    test('data collection defaults to errors, performance, journey and interaction', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {});
        const expected = [
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.paint',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals',
            'com.amazonaws.rum.dom-event'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when http data collection is set then the http plugins are instantiated', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['http']
        });
        const expected = ['com.amazonaws.rum.xhr', 'com.amazonaws.rum.fetch'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when performance data collection is set then the performance plugins are instantiated', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['performance']
        });
        const expected = [
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.paint',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when error data collection is set then the error plugins are instantiated', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['errors']
        });
        const expected = ['com.amazonaws.rum.js-error'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when interaction data collection is set then the interaction plugins are instantiated', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['interaction']
        });
        const expected = ['com.amazonaws.rum.dom-event'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when single page application views data collection is set then the page event plugin is instantiated', async () => {
        // Init
        // @ts-ignore
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: [TELEMETRY_TYPES.SINGLE_PAGE_APP_VIEWS]
        });
        const expected = ['com.amazonaws.rum.page-view'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });
});
