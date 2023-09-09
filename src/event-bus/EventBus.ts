export type Subsriber = (payload: any) => void;

/** A topic-based event bus to facilitate communication between plugins */
export default class EventBus {
    // map<topic, listener>
    private subscribers = new Map<string, Subsriber[]>();

    subscribe(topic: string, subscriber: Subsriber): void {
        const list = this.subscribers.get(topic) ?? [];
        if (list.length === 0) {
            this.subscribers.set(topic, list);
        }
        list.push(subscriber);
    }

    unsubscribe(topic: string, subscriber: Subsriber) {
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

    notify(topic: string, payload: any): void {
        const list = this.subscribers.get(topic);
        if (list) {
            for (const subscriber of list) {
                subscriber(payload);
            }
        }
    }
}
