export type Subscriber = (message: any) => void;
export enum Topic {
    EVENT = 'event'
}

/** A topic-based event bus to facilitate communication between plugins */
export default class EventBus<T = Topic> {
    // map<topic, subscriber>
    private subscribers = new Map<T, Subscriber[]>();

    subscribe(topic: T, subscriber: Subscriber): void {
        const list = this.subscribers.get(topic) ?? [];
        if (!list.length) {
            this.subscribers.set(topic, list);
        }
        list.push(subscriber);
    }

    unsubscribe(topic: T, subscriber: Subscriber) {
        const list = this.subscribers.get(topic);
        if (list) {
            for (let i = 0; i < list.length; i++) {
                if (list[i] === subscriber) {
                    list.splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }

    dispatch(topic: T, message: any): void {
        const list = this.subscribers.get(topic);
        if (list) {
            for (const subscriber of list) {
                subscriber(message);
            }
        }
    }
}
