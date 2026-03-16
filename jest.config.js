/** @type {import('jest').Config} */
module.exports = {
  // Use a minimal node environment — the parity tests are pure TypeScript logic,
  // no React Native / Expo APIs are exercised at all.
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],

  // Transform TypeScript via babel-jest with babel-preset-expo but with
  // reanimated and worklets disabled (react-native-worklets is not installed).
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [
          [
            'babel-preset-expo',
            {
              reanimated: false,
              worklets: false,
            },
          ],
        ],
        plugins: [
          [
            'module-resolver',
            {
              root: ['./'],
              alias: { '@': './src' },
            },
          ],
        ],
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub React Native and Expo modules that are not needed for pure-logic tests
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)$': '<rootDir>/__mocks__/react-native.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-native|@react-native|expo|@expo|babel-preset-expo)/)',
  ],
};
