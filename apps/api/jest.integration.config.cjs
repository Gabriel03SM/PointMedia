module.exports = {
  ...require('./jest.config.cjs'),
  testMatch: ['**/*.integration.spec.ts'],
  testPathIgnorePatterns: ['/generated/'],
  testTimeout: 30000,
};
