import { AwsRumClientInit, CommandQueue } from './CommandQueue';
declare global {
    interface Window {
        AwsNexusTelemetry: AwsRumClientInit;
        AwsRumClient: AwsRumClientInit;
    }
}
if (!window.AwsRumClient && window.AwsNexusTelemetry) {
    window.AwsRumClient = window.AwsNexusTelemetry;
}
if (typeof fetch === 'function' && typeof navigator.sendBeacon === 'function') {
    new CommandQueue().init(window.AwsRumClient);
} else {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    (window as any)[window.AwsRumClient.n] = () => {};
}
