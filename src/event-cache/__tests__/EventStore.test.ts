import { RumEvent } from '../../dispatch/dataplane';
import { EventStore } from '../EventStore';

describe('EventStore tests', () => {
    let store = new EventStore();
    beforeEach(() => {
        store = new EventStore();
    });

    const mockEvent1: RumEvent = {
        id: 'mockEvent1',
        timestamp: new Date(0),
        type: 'mockEvent1',
        metadata: '{}',
        details: '{}'
    };

    const mockEvent2 = {
        id: 'mockEvent2',
        timestamp: new Date(0),
        type: 'mockEvent2',
        metadata: '{}',
        details: '{}'
    };

    test('when event is stored with key then it can be retrieved', async () => {
        // init
        store.put('key', mockEvent1);

        // assert
        const actual = store.get('key');
        expect(actual?.type).toEqual('mockEvent1');
    });
    test('when event is evicted by key then it cannot be retrieved', async () => {
        // init
        store.put('key', mockEvent1);
        store.evict('key');

        // assert
        const actual = store.get('key');
        expect(actual).toBeUndefined();
    });

    test('when event is evicted by id then it cannot be retrieved', async () => {
        // init
        store.put('key', mockEvent1);
        store.evictById(mockEvent1.id);

        // assert
        const actual = store.get('key');
        expect(actual).toBeUndefined();
    });

    test('when key has duplicate then event is overwritten', async () => {
        // init
        store.put('key', mockEvent1);
        store.put('key', mockEvent2);

        // assert
        const actual = store.get('key');
        expect(actual?.type).toEqual('mockEvent2');
        expect(store.getById(mockEvent1.id)).toBeUndefined();
    });
    test('when store is cleared then size is zero', async () => {
        // init
        store.put('one', mockEvent1);
        store.put('two', mockEvent2);
        expect(store.size).toEqual(2);
        store.clear();

        // assert
        expect(store.size).toEqual(0);
    });
});
