import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import {
  createSignature,
  verifySignature,
} from "../../dist/webcrypto/index.js";
import { createSignatureVectorSmokeSuite } from "./shared.ts";

createSignatureVectorSmokeSuite(
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
