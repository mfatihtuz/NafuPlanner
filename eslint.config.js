// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // scripts/ ve functions/ Node tabanlı (RN lint kapsamı dışında).
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'scripts/*', 'functions/*'],
  },
]);
