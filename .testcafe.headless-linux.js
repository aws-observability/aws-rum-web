const rootConfig = require('./.testcaferc.json');
const config = {
    ...rootConfig,
    browsers: ['firefox:headless', 'chrome:headless']
};

module.exports = config;
