import { requestTimeout } from '../request-timeout';

describe('requestTimeout', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('when timeout > 0 then rejects with TimeoutError after specified ms', async () => {
        const promise = requestTimeout(100);

        jest.advanceTimersByTime(100);

        await expect(promise).rejects.toThrow(
            'Request did not complete within 100 ms'
        );
        await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
    });

    test('when timeout is 0 then promise never settles', () => {
        const resolve = jest.fn();
        const reject = jest.fn();

        requestTimeout(0).then(resolve, reject);

        jest.advanceTimersByTime(60000);

        expect(resolve).not.toHaveBeenCalled();
        expect(reject).not.toHaveBeenCalled();
    });

    test('when timeout is undefined then promise never settles', () => {
        const resolve = jest.fn();
        const reject = jest.fn();

        requestTimeout().then(resolve, reject);

        jest.advanceTimersByTime(60000);

        expect(resolve).not.toHaveBeenCalled();
        expect(reject).not.toHaveBeenCalled();
    });
});
