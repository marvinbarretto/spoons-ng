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

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@home/(.*)$': '<rootDir>/src/app/home/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/app/auth/$1',
    '^@pubs/(.*)$': '<rootDir>/src/app/pubs/$1',
    '^@missions/(.*)$': '<rootDir>/src/app/missions/$1',
    '^@check-in/(.*)$': '<rootDir>/src/app/check-in/$1',
    '^@badges/(.*)$': '<rootDir>/src/app/badges/$1',
    '^@users/(.*)$': '<rootDir>/src/app/users/$1',
    '^@landlord/(.*)$': '<rootDir>/src/app/landlord/$1'
  }
}
