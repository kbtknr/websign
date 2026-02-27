import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["lib/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        URLSearchParams: "readonly",
        Headers: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["lib/browser/**/*.ts"],
    languageOptions: {
      globals: {
        crypto: "readonly",
        TextEncoder: "readonly",
      },
    },
  },
  {
    files: ["lib/server/**/*.ts"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
      },
    },
  },
];
