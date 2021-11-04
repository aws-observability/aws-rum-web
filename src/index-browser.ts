import { AwsRumClientInit, CommandQueue } from './CommandQueue';
declare global {
    interface Window {
        AwsRumClient: AwsRumClientInit;
    }
}
if (typeof fetch === 'function' && typeof navigator.sendBeacon === 'function') {
    new CommandQueue().init(window.AwsRumClient);
} else {
    // tslint:disable-next-line:no-empty
    window[window.AwsRumClient.n] = () => {};
}
