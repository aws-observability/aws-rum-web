const rootConfig = require('./.testcaferc.json');

module.exports = {
    ...rootConfig,
    browsers: ['edge', 'firefox', 'chrome'],
    concurrency: 3,
    browserInitTimeout: 360000
};
