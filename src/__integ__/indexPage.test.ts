import { Selector } from 'testcafe';

fixture('Sanity check').page('http://localhost:8080/');

test('index.html of the integ test application loads.', async (t: TestController) => {
    const welcome: Selector = Selector('#welcome');
    await t
        .expect(welcome.textContent)
        .eql('This application is used for RUM integ testing.');
});
