import { describe, expect, test } from "vitest";
import {
  createSignature,
  verifySignature,
} from "../../lib/node/signature";
import { canonicalRequestCases } from "../shared/canonical-requests";
import {
  ed25519DefaultPublicKey,
  ed25519DefaultPrivateKey,
  hmacDefaultKey,
} from "../shared/signing-keys";

async function createNodeHmacSignature(
  canonicalRequestName: string,
  canonicalRequestIndex = 0,
) {
  const canonicalInput =
    canonicalRequestCases.find((value) => value.name === canonicalRequestName)
      ?.input[canonicalRequestIndex];

  if (!canonicalInput) {
    throw new Error(
      `Canonical request not found: ${canonicalRequestName}[${canonicalRequestIndex}]`,
    );
  }

  return createSignature({
    ...canonicalInput,
    algorithm: "HMAC-SHA256",
    secretKey: hmacDefaultKey,
  });
}

async function createNodeEd25519Signature(
  canonicalRequestName: string,
  canonicalRequestIndex = 0,
) {
  const canonicalInput =
    canonicalRequestCases.find((value) => value.name === canonicalRequestName)
      ?.input[canonicalRequestIndex];

  if (!canonicalInput) {
    throw new Error(
      `Canonical request not found: ${canonicalRequestName}[${canonicalRequestIndex}]`,
    );
  }

  return createSignature({
    ...canonicalInput,
    algorithm: "Ed25519",
    privateKey: ed25519DefaultPrivateKey,
  });
}

describe("node signature", () => {
  describe("署名して検証できる", () => {
    for (const testCase of canonicalRequestCases) {
      test(`HMAC: ${testCase.name}`, async () => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const nodeResult = await createNodeHmacSignature(testCase.name, index);

          expect(
            nodeResult.algorithm,
            `HMAC algorithm mismatch: ${testCase.name}[${index}]`,
          ).toBe("HMAC-SHA256");
          expect(
            nodeResult.signedHeaders,
            `HMAC signedHeaders should not be empty: ${testCase.name}[${index}]`,
          ).not.toBe("");

          await expect(
            verifySignature({
              ...canonicalInput,
              algorithm: "HMAC-SHA256",
              secretKey: hmacDefaultKey,
              signature: nodeResult.signature,
            }),
            `HMAC node verify failed: ${testCase.name}[${index}]`,
          ).resolves.toBe(true);
        }
      });
    }

    for (const testCase of canonicalRequestCases) {
      test(`Ed25519: ${testCase.name}`, async () => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const nodeResult = await createNodeEd25519Signature(
            testCase.name,
            index,
          );

          expect(
            nodeResult.algorithm,
            `Ed25519 algorithm mismatch: ${testCase.name}[${index}]`,
          ).toBe("Ed25519");
          expect(
            nodeResult.signedHeaders,
            `Ed25519 signedHeaders should not be empty: ${testCase.name}[${index}]`,
          ).not.toBe("");

          await expect(
            verifySignature({
              ...canonicalInput,
              algorithm: "Ed25519",
              publicKey: ed25519DefaultPublicKey,
              signature: nodeResult.signature,
            }),
            `Ed25519 node verify failed: ${testCase.name}[${index}]`,
          ).resolves.toBe(true);
        }
      });
    }
  });

  describe("同値入力", () => {
    for (const testCase of canonicalRequestCases.filter(
      (value) => value.input.length > 1,
    )) {
      test(`HMAC は同じ署名値になる: ${testCase.name}`, async () => {
        const signatures = await Promise.all(
          testCase.input.map((_, index) =>
            createNodeHmacSignature(testCase.name, index),
          ),
        );
        const expectedSignature = signatures[0]?.signature;
        const expectedSignedHeaders = signatures[0]?.signedHeaders;

        for (const [index, result] of signatures.entries()) {
          expect(
            result.signature,
            `HMAC equivalent signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignature);
          expect(
            result.signedHeaders,
            `HMAC equivalent signedHeaders mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignedHeaders);
        }
      });
    }

    for (const testCase of canonicalRequestCases.filter(
      (value) => value.input.length > 1,
    )) {
      test(`Ed25519 は同じ署名値になる: ${testCase.name}`, async () => {
        const signatures = await Promise.all(
          testCase.input.map((_, index) =>
            createNodeEd25519Signature(testCase.name, index),
          ),
        );
        const expectedSignature = signatures[0]?.signature;
        const expectedSignedHeaders = signatures[0]?.signedHeaders;

        for (const [index, result] of signatures.entries()) {
          expect(
            result.signature,
            `Ed25519 equivalent signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignature);
          expect(
            result.signedHeaders,
            `Ed25519 equivalent signedHeaders mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignedHeaders);
        }
      });
    }
  });
});
