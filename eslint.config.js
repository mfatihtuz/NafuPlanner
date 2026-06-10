// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // scripts/ Node tabanlı geliştirme araçlarıdır (RN lint kapsamı dışında).
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'scripts/*'],
  },
]);
