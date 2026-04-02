import { context } from '../../test-utils/test-utils';
import EventBus, { Topic } from '../EventBus';
import { InternalPlugin } from '../../plugins/InternalPlugin';
import { PluginContext } from '../../plugins/types';

export enum MockTopics {
    FOOD = 'food',
    BOOKS = 'books'
}

const MockPluginId = 'Mock-Plugin';
class MockPlugin extends InternalPlugin {
    count = 0;

    constructor() {
        super(MockPluginId);
        this.subscriber = this.subscriber.bind(this);
    }

    enable(): void {} // eslint-disable-line
    disable(): void {} // eslint-disable-line

    protected onload(): void {
        this.context.eventBus.subscribe(Topic.EVENT, this.subscriber); // eslint-disable-line
    }

    subscriber(msg: any) {
        this.count++;
    }
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

    test('when plugin subscribes then observes events', async () => {
        const plugin = new MockPlugin();
        const spy = jest.spyOn(plugin, 'subscriber');

        plugin.load(context);
        context.eventBus.dispatch(Topic.EVENT, 'hat');

        expect(spy).toHaveBeenCalledWith('hat');
    });
});
