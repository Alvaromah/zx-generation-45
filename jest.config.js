export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/audio-worklet.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
