import { RumEvent } from '../dispatch/dataplane';

// store events by calling context.record(type, event, key)
// get events by key with context.getEvent(key)
// events are evicted from store when removed from EventCache
export class EventStore {
    // maps custom keys to RUM events
    private events = new Map<any, RumEvent>();
    // maps event ids to custom keys
    private keys = new Map<string, any>();

    get(key: any) {
        return this.events.get(key);
    }

    getById(id: string) {
        const key = this.keys.get(id);
        if (key) {
            return this.events.get(key);
        }
    }

    put(key: any, event: RumEvent) {
        const dup = this.get(key);
        if (dup) {
            this.keys.delete(dup.id);
        }
        this.keys.set(event.id, key);
        this.events.set(key, event);
    }

    evict(key: any) {
        const event = this.events.get(key);
        if (event) {
            this.events.delete(key);
            this.keys.delete(event.id);
        }
    }

    evictById(id: string) {
        const key = this.keys.get(id);
        if (key) {
            this.keys.delete(id);
            this.events.delete(key);
        }
    }

    clear() {
        this.events.clear();
        this.keys.clear();
    }

    get size() {
        return this.events.size;
    }
}
