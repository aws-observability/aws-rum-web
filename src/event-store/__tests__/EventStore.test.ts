import { RumEvent } from 'dispatch/dataplane';
import { EventStore } from '../EventStore';

describe('EventStore tests', () => {
    const mockEvent1: RumEvent = {
        id: 'mockEvent1',
        timestamp: new Date(0),
        type: 'mockEvent1',
        metadata: '{}',
        details: '{}'
    };

    const mockEvent2: RumEvent = {
        id: 'mockEvent2',
        timestamp: new Date(0),
        type: 'mockEvent2',
        metadata: '{}',
        details: '{}'
    };

    const limit = 2;
    let store: EventStore;
    beforeEach(() => {
        store = new EventStore(limit);
    });

    test('when event is stored then it can be found', async () => {
        store.add('key', mockEvent1);
        const actual = store.find('key');
        expect(actual?.id).toEqual(mockEvent1.id);
    });

    test('when store limit is exceeded then the oldest event is dropped', async () => {
        store.add('one', mockEvent1);
        store.add('two', mockEvent1);
        store.add('three', mockEvent2);
        expect(store.getSize()).toEqual(limit);
        expect(store.find('one')).toBeUndefined();
        expect(store.find('two')).toEqual(expect.anything());
        expect(store.find('three')).toEqual(expect.anything());
    });
    test('when key has duplicate then the first match is returned', async () => {
        store.add('one', mockEvent1);
        store.add('one', mockEvent2);
        expect(store.find('one')?.id).toEqual(mockEvent1.id);
    });
    test('when store is cleared then size is zero', async () => {
        store.add('one', mockEvent1);
        store.add('two', mockEvent1);
        expect(store.getSize()).toEqual(2);
        store.clear();
        expect(store.getSize()).toEqual(0);
    });
});
