fixture('Command Queue');

// @ts-ignore
test.clientScripts({
    content: `
    window.addEventListener('unhandledrejection', function (e) {
        console.error(e.reason.message);
    });`
})(
    'command enqueued before RUM web client loads is executed after RUM web client loads',
    async (t: TestController) => {
        await t.navigateTo(
            'http://localhost:8080/pre_load_command_queue_test.html'
        );
        await t.wait(2000);
        const error = (await t.getBrowserConsoleMessages()).error;
        await t
            .expect(error[0])
            .contains('UnsupportedOperationException: unsupported_command');
    }
);

// @ts-ignore
test.clientScripts({
    content: `
    window.addEventListener('unhandledrejection', function (e) {
        console.error(e.reason.message);
    });`
})(
    'command enqueued after RUM web client loads is executed',
    async (t: TestController) => {
        await t.navigateTo(
            'http://localhost:8080/post_load_command_queue_test.html'
        );
        await t.wait(2000);
        const error = (await t.getBrowserConsoleMessages()).error;
        await t
            .expect(error[0])
            .contains('UnsupportedOperationException: unsupported_command');
    }
);
