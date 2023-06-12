/** array implmementation of queue */
export class Queue<T> {
    private list: T[] = [];
    constructor(readonly capacity: number) {}

    get length() {
        return this.list.length;
    }

    get isFull() {
        return this.length === this.capacity;
    }

    add(val: T): boolean {
        if (this.isFull) {
            return false;
        }
        this.list.push(val);
        return true;
    }

    pull(): T | undefined {
        return this.list.shift();
    }

    findFirstMatchAndPull(match: (val: T) => boolean): T | undefined {
        const list = this.list;
        for (let i = 0; i < list.length; i++) {
            const val = list[i];
            if (match(val)) {
                list.splice(i, 1);
                return val;
            }
        }
    }
}
