const rootConfig = require('./.testcaferc.json');
const config = {
    ...rootConfig,
    browsers: ['edge:headless']
};

module.exports = config;
