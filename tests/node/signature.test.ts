import { describe, expect, test } from "vitest";
import { createSignature, verifySignature } from "../../lib/node/signature.ts";
import { createSignatureTestSuite } from "../shared/signature-test-suite.ts";

createSignatureTestSuite(
  "node",
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
