import { AwsRumClientInit, CommandQueue } from './CommandQueue';
declare global {
    interface Window {
        AwsRumClient: AwsRumClientInit;
    }
}
// tslint:disable:no-unused-expression
new CommandQueue(window.AwsRumClient);
