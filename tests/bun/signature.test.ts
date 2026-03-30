import { describe, expect, test } from "bun:test";
import {
  createSignature,
  verifySignature,
} from "../../lib/webcrypto/signature.ts";
import { createSignatureTestSuite } from "../shared/signature-test-suite.ts";

createSignatureTestSuite(
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
