const path = require('path');

module.exports = {
    rootDir: __dirname,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '__tests__',
        '__integ__',
        '__smoke-test__',
        'test-utils',
        '/node_modules/',
        '/dist/',
        '/build/',
        '/loader/'
    ],
    collectCoverageFrom: [
        'packages/core/src/**/*.ts',
        'packages/web/src/**/*.ts',
        'packages/slim/src/**/*.ts',
        '!packages/*/src/**/__tests__/**',
        '!packages/*/src/**/__integ__/**',
        '!packages/*/src/**/__smoke-test__/**',
        '!packages/*/src/**/test-utils/**',
        '!packages/*/src/**/loader/**',
        '!packages/*/src/**/mock-*'
    ],
    testEnvironmentOptions: {
        url: 'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
    },
    moduleFileExtensions: ['js', 'json', 'node', 'ts'],
    testEnvironment: 'jest-environment-jsdom-global',
    testMatch: [
        '**/packages/core/__tests__/**/*.test.ts',
        '**/packages/web/__tests__/**/*.test.ts',
        '**/packages/slim/__tests__/**/*.test.ts'
    ],
    moduleNameMapper: {
        '^@aws-rum/web-core/(.*)$': '<rootDir>/packages/core/src/$1',
        '^@aws-rum/web-slim/(.*)$': '<rootDir>/packages/slim/src/$1'
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
