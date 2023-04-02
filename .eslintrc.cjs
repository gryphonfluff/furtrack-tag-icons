module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      },
    ],
    "@typescript-eslint/no-explicit-any": [
      "warn",
      {
        "ignoreRestArgs": true,
      },
    ],
  },
};

// vim: ts=2 sw=2 sts=2 et
