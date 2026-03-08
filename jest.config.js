const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
})

const customJestConfig = {
    coverageProvider: 'v8',
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transformIgnorePatterns: [
        // Allow jest to transform these ESM packages. Next.js natively handles this, but Jest needs help.
        '/node_modules/(?!(lucide-react|next-auth|@auth|oauth4webapi)/)'
    ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
    const config = await createJestConfig(customJestConfig)();

    // Override transformIgnorePatterns provided by next/jest to ensure our custom patterns apply
    config.transformIgnorePatterns = customJestConfig.transformIgnorePatterns;

    return config;
};
