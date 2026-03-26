import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

const sharedWebGlobals = {
  ArrayBuffer: "readonly",
  Blob: "readonly",
  BufferSource: "readonly",
  File: "readonly",
  Headers: "readonly",
  TextEncoder: "readonly",
  URLSearchParams: "readonly",
  crypto: "readonly",
};

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
      globals: sharedWebGlobals,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["lib/webcrypto/**/*.ts"],
    languageOptions: {
      globals: sharedWebGlobals,
    },
  },
  {
    files: ["lib/node/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
