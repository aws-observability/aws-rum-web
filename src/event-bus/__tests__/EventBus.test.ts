import EventBus from '../EventBus';

describe('EventBus tests', () => {
    let eventBus: EventBus;
    const l1 = jest.fn();
    const l2 = jest.fn();
    beforeEach(() => {
        eventBus = new EventBus();
        jest.clearAllMocks();
    });
    test('when notify is invoked then all listeners are called', async () => {
        // init
        eventBus.subscribe('food', l1);
        eventBus.subscribe('food', l2);

        // run
        eventBus.notify('food', 'burger');

        // assert
        expect(l1).toHaveBeenCalledWith('burger');
        expect(l2).toHaveBeenCalledWith('burger');
    });

    test('when listener is removed then it is not called', async () => {
        // init
        eventBus.subscribe('food', l1);
        eventBus.subscribe('food', l2);
        const removed = eventBus.unsubscribe('food', l2);

        // run
        eventBus.notify('food', 'burger');

        // assert
        expect(l1).toHaveBeenCalledWith('burger');
        expect(removed).toBe(true);
        expect(l2).not.toHaveBeenCalled();
    });
});
