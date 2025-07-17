const { createCjsPreset } = require('jest-preset-angular/presets');

module.exports = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$)|nanoid)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@home/(.*)$': '<rootDir>/src/app/home/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/app/auth/$1',
    '^@pubs/(.*)$': '<rootDir>/src/app/pubs/$1',
    '^@points/(.*)$': '<rootDir>/src/app/points/$1',
    '^@missions/(.*)$': '<rootDir>/src/app/missions/$1',
    '^@check-in/(.*)$': '<rootDir>/src/app/check-in/$1',
    '^@carpets/(.*)$': '<rootDir>/src/app/carpets/$1',
    '^@badges/(.*)$': '<rootDir>/src/app/badges/$1',
    '^@users/(.*)$': '<rootDir>/src/app/users/$1',
    '^@landlord/(.*)$': '<rootDir>/src/app/landlord/$1',
    '^@feedback/(.*)$': '<rootDir>/src/app/feedback/$1',
    '^@widgets/(.*)$': '<rootDir>/src/app/widgets/$1',

  }
};
