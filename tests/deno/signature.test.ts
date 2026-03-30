import {
  createSignature,
  verifySignature,
} from "../../lib/webcrypto/signature.ts";
import { createSignatureTestSuite } from "../shared/signature-test-suite.ts";
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

createSignatureTestSuite(
  "deno",
  {
    createSignature,
    verifySignature,
  },
  {
    describe,
    test: it,
    expect,
  },
);
