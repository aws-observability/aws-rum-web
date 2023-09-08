import EventBus, { Topic } from '../EventBus';

export enum MockTopics {
    FOOD = 'food',
    BOOKS = 'books'
}
describe('EventBus tests', () => {
    let eventBus: EventBus<MockTopics>;
    const l1 = jest.fn();
    const l2 = jest.fn();
    beforeEach(() => {
        eventBus = new EventBus();
        jest.clearAllMocks();
    });
    test('when dispatch is invoked then all listeners are called', async () => {
        // init
        eventBus.subscribe(MockTopics.FOOD, l1);
        eventBus.subscribe(MockTopics.FOOD, l2);

        // run
        eventBus.dispatch(MockTopics.FOOD, 'burger');

        // assert
        expect(l1).toHaveBeenCalledWith('burger');
        expect(l2).toHaveBeenCalledWith('burger');
    });

    test('when subscriber is removed then it is not called', async () => {
        // init
        eventBus.subscribe(MockTopics.FOOD, l1);
        eventBus.subscribe(MockTopics.FOOD, l2);
        const removed = eventBus.unsubscribe(MockTopics.FOOD, l2);

        // run
        eventBus.dispatch(MockTopics.FOOD, 'burger');

        // assert
        expect(l1).toHaveBeenCalledWith('burger');
        expect(removed).toBe(true);
        expect(l2).not.toHaveBeenCalled();
    });

    test('when subscribed to topic A then does not hear topic B', async () => {
        eventBus.subscribe(MockTopics.FOOD, l1);
        eventBus.subscribe(MockTopics.BOOKS, l2);

        // run
        eventBus.dispatch(MockTopics.FOOD, 'burger');

        // assert
        expect(l2).not.toHaveBeenCalled();
    });
});
