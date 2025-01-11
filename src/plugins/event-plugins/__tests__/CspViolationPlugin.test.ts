import { context, getSession, record } from '../../../test-utils/test-utils';
import { CSP_VIOLATION_EVENT_TYPE } from '../../utils/constant';
import { CspViolationPlugin } from '../CspViolationPlugin';

declare global {
    namespace jest {
        interface Expect {
            toBePositive(): any;
        }
    }
}

function dispatchCspViolationEvent() {
    const event = new Event(
        'securitypolicyviolation'
    ) as SecurityPolicyViolationEvent;
    // its important to apply our expected event details to the event before dispatching it.
    Object.assign(event, {
        violatedDirective: 'test:violatedDirective',
        documentURI: 'http://documentURI',
        blockedURI: 'https://blockedURI',
        originalPolicy: 'test:originalPolicy',
        referrer: 'test:referrer',
        statusCode: 200,
        effectiveDirective: 'test:effectiveDirective'
    });

    dispatchEvent(event);
}

expect.extend({
    toBePositive(recieved) {
        const pass = recieved > 0;
        if (pass) {
            return {
                message: () =>
                    `expected ${recieved} not to be a positive integer`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${recieved} to be a positive integer`,
                pass: false
            };
        }
    }
});

describe('CspViolationPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
        getSession.mockClear();
    });

    test('when a SecurityPolicyViolationEvent is triggered then the plugin records cspViolationEvent', async () => {
        // Init
        const plugin: CspViolationPlugin = new CspViolationPlugin();

        // Run
        plugin.load(context);
        dispatchCspViolationEvent();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(CSP_VIOLATION_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                blockedURI: 'https://blockedURI',
                documentURI: 'http://documentURI',
                effectiveDirective: 'test:effectiveDirective',
                originalPolicy: 'test:originalPolicy',
                referrer: 'test:referrer',
                statusCode: 200
            })
        );
    });

    test('when plugin disabled then plugin does not record events', async () => {
        // Init
        const plugin: CspViolationPlugin = new CspViolationPlugin();

        // Run
        plugin.load(context);
        plugin.disable();

        dispatchCspViolationEvent();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when enabled then plugin records events', async () => {
        // Init
        const plugin: CspViolationPlugin = new CspViolationPlugin();

        // Run
        plugin.load(context);
        plugin.disable();
        plugin.enable();
        dispatchCspViolationEvent();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when record is used then errors are not passed to the ignore function', async () => {
        // Init
        const mockIgnore = jest.fn();
        const plugin: CspViolationPlugin = new CspViolationPlugin({
            ignore: mockIgnore
        });

        // Run
        plugin.load(context);
        const event = new Event(
            'securitypolicyviolation'
        ) as SecurityPolicyViolationEvent;
        plugin.record(event);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
        expect(mockIgnore).not.toHaveBeenCalled();
    });

    test('by default SecurityPolicyViolationEvents are not ignored', async () => {
        // Init
        const plugin: CspViolationPlugin = new CspViolationPlugin();

        // Run
        plugin.load(context);
        dispatchCspViolationEvent();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when a specific documentUri is ignored then SecurityPolicyViolationEvents are not recorded', async () => {
        // Init
        const plugin: CspViolationPlugin = new CspViolationPlugin({
            ignore: (e) => {
                const ignoredDocuments = ['http://documentURI'];
                return ignoredDocuments.includes(
                    (e as SecurityPolicyViolationEvent).documentURI
                );
            }
        });

        // Run
        plugin.load(context);
        dispatchCspViolationEvent();
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });
});
