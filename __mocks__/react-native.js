/**
 * Minimal React Native stub for pure-logic Jest tests.
 * VinylItemCard imports from react-native, but parity tests never render components —
 * they only call vinylConfig functions. This stub prevents the native module loading error.
 */

const React = require('react');

const View = 'View';
const Text = 'Text';
const Image = 'Image';
const TouchableOpacity = 'TouchableOpacity';
const StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 1,
  flatten: (style) => style,
};

module.exports = {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
};
