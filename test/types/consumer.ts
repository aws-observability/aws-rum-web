import { AwsRum, RRWebPlugin } from '../../packages/web/dist/es';
import { AwsRum as SlimAwsRum } from '../../packages/slim/dist/es';

new AwsRum('monitor', '1', 'us-east-1', {
    telemetries: ['performance', 'errors', 'http']
});
new SlimAwsRum('monitor', '1', 'us-east-1');
new RRWebPlugin({
    recordOptions: {
        blockSelector: '.private',
        sampling: { mousemove: false }
    }
});
new RRWebPlugin({
    recordOptions: {
        // @ts-expect-error Privacy masking cannot be disabled by callers.
        maskAllInputs: false
    }
});
