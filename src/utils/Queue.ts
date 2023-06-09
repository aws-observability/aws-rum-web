/** array implmementation of queue
 *
 * only implements methods that are needed elsewhere
 */
export class Queue<T> {
    private list: T[] = [];
    constructor(readonly capacity: number) {}

    get size() {
        return this.list.length;
    }

    get isFull() {
        return this.size === this.capacity;
    }

    add(val: T) {
        if (this.isFull) {
            return;
        }
        this.list.push(val);
    }

    findFirstMatchAndPull(match: (val: T) => boolean) {
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
