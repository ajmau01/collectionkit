module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        // babel-preset-expo auto-includes react-native-reanimated/plugin when it detects
        // the package. That plugin requires react-native-worklets which isn't installed.
        // Disable it for test runs; enable it at build time via the explicit plugin entry below.
        isTest ? { reanimated: false } : {},
      ],
    ],
    plugins: [
      // Reanimated plugin requires react-native-worklets at runtime.
      // Skip it during Jest runs — no animation code is exercised in tests.
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
