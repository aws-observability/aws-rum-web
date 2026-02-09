import * as shimmer from 'shimmer';
import { InternalPlugin } from './InternalPlugin';

type Wrapper<W> = () => W;
export interface MonkeyPatch<
    Nodule extends object,
    FieldName extends keyof Nodule
> {
    nodule: Nodule;
    name: FieldName;
    wrapper: Wrapper<(original: Nodule[FieldName]) => Nodule[FieldName]>;
}

export abstract class MonkeyPatched<
    Nodule extends object,
    FieldName extends keyof Nodule
> extends InternalPlugin {
    public enable = this.patch.bind(this, true);
    public disable = this.patch.bind(this, false);

    protected enabled = false;

    protected abstract patches: MonkeyPatch<Nodule, FieldName>[];

    private patchAll() {
        const wrap = shimmer.wrap.bind(shimmer);
        for (const patch of this.patches) {
            wrap(patch.nodule, patch.name, patch.wrapper());
        }
    }

    private unpatchAll() {
        const unwrap = shimmer.unwrap.bind(shimmer);
        for (const patch of this.patches) {
            unwrap(patch.nodule, patch.name);
        }
    }

    private patch(shouldPatch = true) {
        if (this.enabled !== shouldPatch) {
            this.enabled = shouldPatch;
            if (shouldPatch) {
                this.patchAll();
            } else {
                this.unpatchAll();
            }
        }
    }
}
