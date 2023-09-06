export type Subscriber = (message: any) => void;
export interface Message {
    key?: any;
    payload: any;
}

/** A topic-based event bus to facilitate communication between plugins */
export default class EventBus {
    // map<topic, subscriber>
    private subscribers = new Map<string, Subscriber[]>();

    subscribe(topic: string, subscriber: Subscriber): void {
        const list = this.subscribers.get(topic) ?? [];
        if (list.length === 0) {
            this.subscribers.set(topic, list);
        }
        list.push(subscriber);
    }

    unsubscribe(topic: string, subscriber: Subscriber) {
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

    dispatch(topic: string, message: Message): void {
        const list = this.subscribers.get(topic);
        if (list) {
            for (const subscriber of list) {
                subscriber(message);
            }
        }
    }
}
