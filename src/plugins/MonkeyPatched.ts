import * as shimmer from 'shimmer';

type Wrapper<S> = () => (s: S) => S
export interface MonkeyPatch<W> {
    nodule: object;
    name: string;
    wrapper: Wrapper<W>
}

export abstract class MonkeyPatched<W> {
    public enable = this.patch.bind(this, true);
    public disable = this.patch.bind(this, false);

    protected abstract patches: MonkeyPatch<W>[];

    private enabled: boolean = false

    private patch(shouldPatch: boolean = true) {
        if (this.enabled !== shouldPatch) {
            this.enabled = shouldPatch;
            const patchMethod = shouldPatch ? shimmer.wrap.bind(shimmer) : shimmer.unwrap.bind(shimmer);
            for (const patch of this.patches) {
                patchMethod(patch.nodule, patch.name, shouldPatch ? patch.wrapper() : undefined);
            }
        }
    }
}
