import * as shimmer from 'shimmer';

export type MonkeyPatch = {
    nodule: object;
    name: string;
    // tslint:disable-next-line: ban-types
    wrapper: Function;
};

export abstract class MonkeyPatched {
    private enabled: boolean;

    constructor() {
        this.enabled = false;
    }

    public enable() {
        if (!this.enabled) {
            this.enabled = true;
            for (const patch of this.patches()) {
                shimmer.wrap(patch.nodule, patch.name, patch.wrapper());
            }
        }
    }

    public disable() {
        if (this.enabled) {
            this.enabled = false;
            for (const patch of this.patches()) {
                shimmer.unwrap(patch.nodule, patch.name);
            }
        }
    }

    protected abstract patches(): MonkeyPatch[];
}
