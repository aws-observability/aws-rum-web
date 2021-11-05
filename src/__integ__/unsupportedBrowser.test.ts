import { Selector } from 'testcafe';

const viewCommandQueueFunction: Selector = Selector(
    `#viewCommandQueueFunction`
);
const cwrFunction: Selector = Selector(`#cwr_function`);

fixture('Unsupported Browsers').page(
    'http://localhost:8080/unsupported_browser.html'
);

test('when a browser is not supported then the command function is a no-op', async (t: TestController) => {
    if (t.browser.name === 'Internet Explorer') {
        await t
            .wait(300)
            .click(viewCommandQueueFunction)
            .expect(cwrFunction.textContent)
            .contains('function(){}');
    }
});
