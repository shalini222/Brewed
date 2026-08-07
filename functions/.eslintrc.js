module.exports = {
  env: {
    es6: true,
    node: true,
  },

  parserOptions: {
    ecmaVersion: 2020,
  },

  extends: [
    "eslint:recommended",
  ],

  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "prefer-arrow-callback": "off",
    "quotes": "off",
  },

  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
    },
  ],

  globals: {},
};
