import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Node globals for the plain .mjs build/serve scripts and config files.
const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  URL: "readonly",
  Buffer: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  // serve-export.mjs runs under Bun and uses its web-standard globals.
  Bun: "readonly",
  Response: "readonly",
};

const maxLen = [
  "warn",
  {
    code: 120,
    ignoreStrings: true,
    ignoreComments: true,
    ignoreTemplateLiterals: true,
    ignoreUrls: true,
    // Prose-heavy JSX markup lines (legal pages, marketing copy) wrap in the browser.
    ignorePattern: "^\\s*<",
  },
];

export default tseslint.config(
  {
    // Generated output: Next build/export, fumadocs-mdx collections, Playwright reports.
    ignores: [
      ".next/**",
      ".source/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "max-len": maxLen,
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": ["error", { checkThenables: true }],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      // Focusable scroll regions (mdx-components Table) are an axe requirement.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region"], allowExpressionValues: true },
      ],
      "max-len": maxLen,
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  {
    // Playwright's response.json() is untyped by design; keep the async rules on.
    files: ["e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
);
