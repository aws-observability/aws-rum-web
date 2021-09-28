import { CommandQueue } from '../CommandQueue';
import { Orchestration } from '../orchestration/Orchestration';

const getCommandQueue = () => {
    return new CommandQueue({
        q: [],
        n: 'cwr',
        i: 'application_id',
        a: 'application_name',
        v: '1.0',
        r: 'us-west-2'
    });
};

const disable = jest.fn();
const enable = jest.fn();
const dispatch = jest.fn();
const dispatchBeacon = jest.fn();
const setAwsCredentials = jest.fn();
const configurePlugin = jest.fn();
const allowCookies = jest.fn();
const recordPageView = jest.fn();
const recordError = jest.fn();
jest.mock('../orchestration/Orchestration', () => ({
    Orchestration: jest.fn().mockImplementation(() => ({
        disable,
        enable,
        dispatch,
        dispatchBeacon,
        setAwsCredentials,
        configurePlugin,
        allowCookies,
        recordPageView,
        recordError
    }))
}));

describe('CommandQueue tests', () => {
    beforeEach(() => {
        window.performance.getEntriesByType = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('disable calls Orchestration.disable', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'disable',
            p: undefined
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(disable).toHaveBeenCalled();
    });

    test('push() recordEvent throws UnsupportedOperationException', async () => {
        const commandQueue: CommandQueue = getCommandQueue();
        commandQueue
            .push({
                c: 'recordEvent',
                p: { event: 'my_event' }
            })
            .then(() => fail())
            .catch((e) =>
                expect(e).toMatch('UnsupportedOperationException: recordEvent')
            );
    });

    test('enable calls Orchestration.enable', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'enable',
            p: undefined
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(enable).toHaveBeenCalled();
    });

    test('dispatch calls Orchestration.dispatch', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'dispatch',
            p: undefined
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalled();
    });

    test('dispatchBeacon calls Orchestration.dispatchBeacon', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'dispatchBeacon',
            p: undefined
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(dispatchBeacon).toHaveBeenCalled();
    });

    test('setAwsCredentials calls Orchestration.setAwsCredentials', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'setAwsCredentials',
            p: { event: 'my_event' }
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(setAwsCredentials).toHaveBeenCalled();
    });

    test('configurePlugin calls Orchestration.configurePlugin', async () => {
        const cq: CommandQueue = getCommandQueue();
        const result = await cq.push({
            c: 'configurePlugin',
            p: { pluginId: 'myplugin', config: {} }
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(configurePlugin).toHaveBeenCalled();
    });

    test('allowCookies calls Orchestration.allowCookies', async () => {
        const cq: CommandQueue = getCommandQueue();
        await cq.push({
            c: 'allowCookies',
            p: false
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(allowCookies).toHaveBeenCalled();
    });

    test('recordPageView calls Orchestration.recordPageView', async () => {
        const cq: CommandQueue = getCommandQueue();
        await cq.push({
            c: 'recordPageView',
            p: false
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(recordPageView).toHaveBeenCalled();
    });

    test('recordError calls Orchestration.recordError', async () => {
        const cq: CommandQueue = getCommandQueue();
        await cq.push({
            c: 'recordError',
            p: false
        });
        expect(Orchestration).toHaveBeenCalled();
        expect(recordError).toHaveBeenCalled();
    });

    test('allowCookies fails when paylod is non-boolean', async () => {
        const cq: CommandQueue = getCommandQueue();
        await cq
            .push({
                c: 'allowCookies',
                p: ''
            })
            .then((v) => fail('command should fail'))
            .catch((e) =>
                expect(e.message).toEqual('IncorrectParametersException')
            );
    });

    test('when function is unknown, UnsupportedOperationException is thrown', async () => {
        const cq: CommandQueue = getCommandQueue();
        await cq
            .push({
                c: 'badCommand',
                p: undefined
            })
            .then((v) => fail('command should fail'))
            .catch((e) =>
                expect(e.message).toEqual(
                    'UnsupportedOperationException: badCommand'
                )
            );
    });
});
