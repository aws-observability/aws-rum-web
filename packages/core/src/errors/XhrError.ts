export class XhrError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'XMLHttpRequest error';
    }
}
