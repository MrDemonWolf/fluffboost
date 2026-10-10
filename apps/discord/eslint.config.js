import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";

export default [
  // Base configuration
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Type-aware async/exhaustiveness rules: a dropped `await` or an
      // unhandled enum value must fail lint rather than surface in production.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { checkThenables: true },
      ],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],

      // General rules (not TypeScript prefixed)
      "no-console": "off", // We use consola for logging
      "no-unused-vars": "off", // Use TypeScript version instead
      "no-undef": "off", // TypeScript handles this
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Relaxed rules for Discord.js
      "max-len": [
        "warn",
        {
          code: 120,
          ignoreStrings: true,
          ignoreComments: true,
          ignoreTemplateLiterals: true,
        },
      ],
      camelcase: [
        "warn",
        {
          properties: "never",
          ignoreImports: true,
          ignoreDestructuring: true,
        },
      ],
    },
  },

  // JavaScript configuration
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },

  // Tests and E2E: typed through tsconfig.test.json (the main tsconfig excludes
  // *.test.ts). Mocks and fixtures are loosely typed by design, so the
  // explicit-any/non-null warnings are off; the async rules stay on.
  {
    files: ["tests/**/*.ts", "e2e/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      camelcase: "off",
      // Rest-destructuring is how env tests drop a key from a fixture.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      // bun:test types mock.module as `void | Promise<void>` though it registers
      // synchronously, and types `.rejects` matchers as void though they return a
      // promise at runtime, so these two type-aware rules misfire on test code.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { allowForKnownSafeCalls: [{ from: "package", name: "module", package: "bun:test" }] },
      ],
      "@typescript-eslint/await-thenable": "off",
    },
  },

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
    ],
  },
];
