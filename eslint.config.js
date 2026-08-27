const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "api/node_modules/**",
      "docs/**",
    ],
  },
  {
    files: ["script.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-redeclare": "error",
    },
  },
  {
    files: ["script.test.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-redeclare": "error",
    },
  },
];