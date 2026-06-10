// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK (v11) ships CommonJS entry points and uses conditional
// "exports" that Metro's package-exports resolution mishandles, causing the
// classic "Component auth has not been registered yet" error. Allowing .cjs
// and disabling the unstable package-exports resolver is the supported fix.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
