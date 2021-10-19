import { AwsRumClientInit, CommandQueue } from './CommandQueue';
declare global {
    interface Window {
        AwsRumClient: AwsRumClientInit;
    }
}
new CommandQueue().init(window.AwsRumClient);
