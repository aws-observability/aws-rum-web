import * as shimmer from 'shimmer';
import { Plugin, PluginContext } from './Plugin';

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
> extends Plugin {
    public enable = this.patch.bind(this, true);
    public disable = this.patch.bind(this, false);

    protected enabled: boolean = false;

    protected abstract patches: MonkeyPatch<Nodule, FieldName>[];

    abstract load(context: PluginContext): void;

    private patch(shouldPatch: boolean = true) {
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
