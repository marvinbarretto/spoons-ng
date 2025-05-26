// module.exports = {
//     preset: 'jest-preset-angular',
//     setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
//     watchPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
//     testEnvironment: 'jsdom',
// };

export default {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js', 'html', 'json', 'mjs'],
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)'],
}
