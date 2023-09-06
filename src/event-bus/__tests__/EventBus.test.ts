import EventBus from '../EventBus';

describe('EventBus tests', () => {
    let eventBus: EventBus;
    const l1 = jest.fn();
    const l2 = jest.fn();
    beforeEach(() => {
        eventBus = new EventBus();
        jest.clearAllMocks();
    });
    test('when dispatch is invoked then all listeners are called', async () => {
        // init
        eventBus.subscribe('food', l1);
        eventBus.subscribe('food', l2);

        // run
        eventBus.dispatch('food', { key: 'bk', payload: 'whopper' });

        // assert
        expect(l1).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'bk', payload: 'whopper' })
        );
        expect(l2).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'bk', payload: 'whopper' })
        );
    });

    test('when listener is removed then it is not called', async () => {
        // init
        eventBus.subscribe('food', l1);
        eventBus.subscribe('food', l2);
        const removed = eventBus.unsubscribe('food', l2);

        // run
        eventBus.dispatch('food', { payload: 'sushi' });

        // assert
        expect(l1).toHaveBeenCalledWith(
            expect.objectContaining({ payload: 'sushi' })
        );
        expect(removed).toBe(true);
        expect(l2).not.toHaveBeenCalled();
    });
});
