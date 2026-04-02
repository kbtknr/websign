import { describe, expect, test } from "bun:test";
import {
  createSignature,
  verifySignature,
} from "../../dist/webcrypto/index.js";
import { createSignatureVectorSmokeSuite } from "./shared.ts";

createSignatureVectorSmokeSuite(
  "bun",
  {
    createSignature,
    verifySignature,
  },
  {
    describe,
    test,
    expect,
  },
);
