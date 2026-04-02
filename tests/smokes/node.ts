import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createSignature, verifySignature } from "../../dist/node/index.js";
import { createSignatureVectorSmokeSuite } from "./shared.ts";

createSignatureVectorSmokeSuite(
  "node",
  {
    createSignature,
    verifySignature,
  },
  {
    describe,
    test,
    expect: (value, message) => ({
      toBe: (expected) => assert.equal(value, expected, message),
    }),
  },
);
