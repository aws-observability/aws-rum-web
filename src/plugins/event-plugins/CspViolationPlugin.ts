import { InternalPlugin } from '../InternalPlugin';
import { CSP_VIOLATION_EVENT_TYPE } from '../utils/constant';

export const CSP_VIOLATION_EVENT_PLUGIN_ID = 'csp-violation';

export type CspViolationPluginConfig = {
    ignore: (error: SecurityPolicyViolationEvent) => boolean;
};

export type PartialCspViolationPluginConfig = {
    ignore?: (error: SecurityPolicyViolationEvent) => boolean;
};

const defaultConfig: CspViolationPluginConfig = {
    ignore: () => false
};

export class CspViolationPlugin extends InternalPlugin {
    private config: CspViolationPluginConfig;

    constructor(config?: PartialCspViolationPluginConfig) {
        super(CSP_VIOLATION_EVENT_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.addEventHandler();
        this.enabled = true;
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.removeEventHandler();
        this.enabled = false;
    }

    record(cspViolationEvent: any): void {
        this.recordCspViolationEvent(cspViolationEvent);
    }

    protected onload(): void {
        this.addEventHandler();
    }

    private eventHandler = (
        cspViolationEvent: SecurityPolicyViolationEvent
    ) => {
        if (!this.config.ignore(cspViolationEvent)) {
            this.recordCspViolationEvent(cspViolationEvent);
        }
    };

    private recordCspViolationEvent(
        cspViolationEvent: SecurityPolicyViolationEvent
    ) {
        this.context?.record(CSP_VIOLATION_EVENT_TYPE, {
            ...cspViolationEvent,
            version: '1.0.0'
        });
    }

    private addEventHandler(): void {
        window.addEventListener('securitypolicyviolation', this.eventHandler);
    }

    private removeEventHandler(): void {
        window.removeEventListener(
            'securitypolicyviolation',
            this.eventHandler
        );
    }
}
