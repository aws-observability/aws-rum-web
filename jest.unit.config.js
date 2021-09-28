module.exports = {
    collectCoverage: !!process.env.BRAZIL_PACKAGE_NAME,
    coveragePathIgnorePatterns: ['__tests__', '__integ__', '/node_modules/'],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.unit.json'
        }
    },
    testURL:
        'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback',
    moduleFileExtensions: ['js', 'json', 'node', 'ts'],
    testEnvironment: 'jest-environment-jsdom-global',
    testMatch: ['**/__tests__/**/*.js', '**/__tests__/**/*.ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' },
    reporters: ['default'],
    coverageReporters: [
        'json',
        'json-summary',
        'cobertura',
        'text',
        'html',
        'clover'
    ]
};
