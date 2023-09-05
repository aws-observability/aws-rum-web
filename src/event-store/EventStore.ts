import { RumEvent } from 'dispatch/dataplane';

export class EventStore {
    // linked list queue initialized with empty root node
    // to save some lines of code
    private root: any = { next: null };
    private head = this.root;
    private size = 0;

    constructor(readonly limit = 15) {}

    // adds key value pair in constant time
    add(key: any, val: RumEvent) {
        // drop oldest event
        if (this.size === this.limit) {
            this.pop();
        }
        // add to queue
        this.head.next = { key, val, next: null };
        this.head = this.head.next;
        this.size++;
    }

    // remove and return the first node
    private pop() {
        if (!this.root.next) {
            return;
        }
        const tmp = this.root.next;
        if (this.size === 1) {
            this.head = this.root;
            this.root.next = null;
        } else {
            this.root.next = tmp.next;
        }
        this.size--;
        return tmp;
    }

    // finds first match and returns rum event in linear time
    find(key: any) {
        let node = this.root.next;
        while (node) {
            if (node.key === key) {
                return node.val as RumEvent;
            }
            node = node.next;
        }
    }

    getSize() {
        return this.size;
    }

    clear() {
        this.size = 0;
        this.root.next = null;
        this.head = this.root;
    }
}
