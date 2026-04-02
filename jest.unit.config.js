const path = require('path');

module.exports = {
    rootDir: __dirname,
    collectCoverage: !!process.env.BRAZIL_PACKAGE_NAME,
    coveragePathIgnorePatterns: ['__tests__', '__integ__', '/node_modules/'],
    testEnvironmentOptions: {
        url: 'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
    },
    moduleFileExtensions: ['js', 'json', 'node', 'ts'],
    testEnvironment: 'jest-environment-jsdom-global',
    testMatch: [
        '**/packages/core/src/**/__tests__/**/*.ts',
        '**/packages/aws-rum-web/src/**/__tests__/**/*.ts'
    ],
    moduleNameMapper: {
        '^@aws-rum-web/core/(.*)$': '<rootDir>/packages/core/src/$1'
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: path.resolve(__dirname, 'tsconfig.unit.json')
            }
        ]
    },
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
