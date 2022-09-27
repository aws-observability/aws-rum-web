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

    private patch(shouldPatch = true) {
        if (this.enabled !== shouldPatch) {
            this.enabled = shouldPatch;
            const patchMethod = shouldPatch
                ? shimmer.wrap.bind(shimmer)
                : shimmer.unwrap.bind(shimmer);
            for (const patch of this.patches) {
                patchMethod(
                    patch.nodule,
                    patch.name,
                    shouldPatch ? patch.wrapper() : undefined
                );
            }
        }
    }
}
