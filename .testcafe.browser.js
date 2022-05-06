const rootConfig = require('./.testcaferc.json');

module.exports = {
    ...rootConfig,
    browsers: ['edge', 'firefox', 'chrome']
};
