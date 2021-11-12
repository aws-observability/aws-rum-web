import { Orchestration } from '../../../orchestration/Orchestration';
import { createAwsCredentials } from '../../../test-utils/test-utils';
import { PartialHttpPluginConfig } from '../../utils/http-utils';
import { FetchPlugin } from '../FetchPlugin';

const mockFetch = jest.fn(
    (input: RequestInfo, init?: RequestInit) =>
        Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: [],
            body: '{}',
            ok: true
        }) as any
);

global.fetch = mockFetch;
global.Request = jest.fn().mockImplementation((url, requestOptions) => ({
    url,
    body: requestOptions.body
}));

describe('FetchPlugin integ tests', () => {
    afterEach(() => {
        mockFetch.mockClear();
    });

    test('dispatch requests are not recorded by the http plugin', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true
        };

        const orchestration = new Orchestration('a', 'c', 'us-west-2', {
            dispatchInterval: 0,
            eventPluginsToLoad: [new FetchPlugin(config)],
            telemetries: []
        });

        // Run
        orchestration.setAwsCredentials(createAwsCredentials());
        orchestration.recordPageView('/home');
        orchestration.dispatch();
        await new Promise((resolve) => setTimeout(() => resolve(null), 0));
        orchestration.dispatch();
        await new Promise((resolve) => setTimeout(() => resolve(null), 0));

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});
