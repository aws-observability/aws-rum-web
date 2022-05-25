export abstract class Configurable<ConfigType extends object = {}> {
    private readonly config: ConfigType;

    protected constructor(config?: Partial<ConfigType>) {
        this.config = {
            ...(this.getDefaultConfig?.() ?? {}),
            ...config
        } as ConfigType;
    }

    public setConfigValue<K extends keyof ConfigType>(
        key: K,
        value: ConfigType[K]
    ) {
        this.config[key] = value;
    }

    public getConfigValue<K extends keyof ConfigType>(
        key: K,
        defaultValue?: ConfigType[K]
    ): ConfigType[K] {
        return this.config[key] ?? defaultValue;
    }

    protected getFullConfig() {
        return this.config;
    }

    protected getDefaultConfig?(): ConfigType;
}
