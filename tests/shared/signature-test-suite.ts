import type {
  CanonicalRequestInput,
  CreateSignatureInput,
  PayloadInput,
  SignatureResult,
  VerifySignatureInput,
} from "../../lib/types.ts";
import { canonicalRequestCases } from "./canonical-requests.ts";
import {
  ed25519AltPrivateKey,
  ed25519AltPublicKey,
  ed25519DefaultPrivateKey,
  ed25519DefaultPublicKey,
  hmacAltKey,
  hmacDefaultKey,
} from "./signing-keys.ts";

type CreateSignature = (
  input: CreateSignatureInput<PayloadInput>,
) => Promise<SignatureResult>;
type VerifySignature = (
  input: VerifySignatureInput<PayloadInput>,
) => Promise<boolean>;
type Describe = (name: string, fn: () => void) => void;
type Test = (name: string, fn: () => Promise<void> | void) => void;
type Expect = (value: unknown, message?: string) => {
  toBe: (expected: unknown) => void;
  not: {
    toBe: (expected: unknown) => void;
  };
};

function getCanonicalInput(
  canonicalRequestName: string,
  canonicalRequestIndex = 0,
) {
  const canonicalInput =
    canonicalRequestCases.find(
      (value) => value.name === canonicalRequestName,
    )
      ?.input[canonicalRequestIndex];

  if (!canonicalInput) {
    throw new Error(
      `Canonical request not found: ${canonicalRequestName}[${canonicalRequestIndex}]`,
    );
  }

  return canonicalInput;
}

export function createSignatureTestSuite(
  runtimeName: string,
  api: {
    createSignature: CreateSignature;
    verifySignature: VerifySignature;
  },
  hooks: {
    describe: Describe;
    test: Test;
    expect: Expect;
  },
) {
  const { createSignature, verifySignature } = api;
  const { describe, test, expect } = hooks;

  async function createHmacSignature(
    canonicalRequestName: string,
    canonicalRequestIndex = 0,
  ) {
    const canonicalInput = getCanonicalInput(
      canonicalRequestName,
      canonicalRequestIndex,
    );

    return createSignature({
      ...canonicalInput,
      algorithm: "HMAC-SHA256",
      secretKey: hmacDefaultKey,
    });
  }

  async function createEd25519Signature(
    canonicalRequestName: string,
    canonicalRequestIndex = 0,
  ) {
    const canonicalInput = getCanonicalInput(
      canonicalRequestName,
      canonicalRequestIndex,
    );

    return createSignature({
      ...canonicalInput,
      algorithm: "Ed25519",
      privateKey: ed25519DefaultPrivateKey,
    });
  }

  describe(`${runtimeName} signature`, () => {
    describe("署名して検証できる", () => {
      for (const testCase of canonicalRequestCases) {
        test(`HMAC: ${testCase.name}`, async () => {
          for (const [index, canonicalInput] of testCase.input.entries()) {
            const result = await createHmacSignature(testCase.name, index);

            expect(
              result.algorithm,
              `HMAC algorithm mismatch: ${testCase.name}[${index}]`,
            ).toBe("HMAC-SHA256");
            expect(
              result.signedHeaders,
              `HMAC signedHeaders should not be empty: ${testCase.name}[${index}]`,
            ).not.toBe("");

            const ok = await verifySignature({
              ...canonicalInput,
              algorithm: "HMAC-SHA256",
              secretKey: hmacDefaultKey,
              signature: result.signature,
            });

            expect(
              ok,
              `HMAC verify failed: ${testCase.name}[${index}]`,
            ).toBe(true);
          }
        });
        test(`Ed25519: ${testCase.name}`, async () => {
          for (const [index, canonicalInput] of testCase.input.entries()) {
            const result = await createEd25519Signature(testCase.name, index);

            expect(
              result.algorithm,
              `Ed25519 algorithm mismatch: ${testCase.name}[${index}]`,
            ).toBe("Ed25519");
            expect(
              result.signedHeaders,
              `Ed25519 signedHeaders should not be empty: ${testCase.name}[${index}]`,
            ).not.toBe("");

            const ok = await verifySignature({
              ...canonicalInput,
              algorithm: "Ed25519",
              publicKey: ed25519DefaultPublicKey,
              signature: result.signature,
            });

            expect(
              ok,
              `Ed25519 verify failed: ${testCase.name}[${index}]`,
            ).toBe(true);
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
              createHmacSignature(testCase.name, index),
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
        test(`Ed25519 は同じ署名値になる: ${testCase.name}`, async () => {
          const signatures = await Promise.all(
            testCase.input.map((_, index) =>
              createEd25519Signature(testCase.name, index),
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

    describe("鍵差分", () => {
      test("HMAC はキーが変われば署名が変わる", async () => {
        const canonicalInput = canonicalRequestCases[0]?.input[0];

        if (!canonicalInput) {
          throw new Error("Canonical request not found: base[0]");
        }

        const defaultResult = await createSignature({
          ...canonicalInput,
          algorithm: "HMAC-SHA256",
          secretKey: hmacDefaultKey,
        });
        const altResult = await createSignature({
          ...canonicalInput,
          algorithm: "HMAC-SHA256",
          secretKey: hmacAltKey,
        });

        expect(defaultResult.signature).not.toBe(altResult.signature);
      });

      test("HMAC はキーが変われば検証に失敗する", async () => {
        const canonicalInput = canonicalRequestCases[0]?.input[0];

        if (!canonicalInput) {
          throw new Error("Canonical request not found: base[0]");
        }

        const defaultResult = await createSignature({
          ...canonicalInput,
          algorithm: "HMAC-SHA256",
          secretKey: hmacDefaultKey,
        });
        const ok = await verifySignature({
          ...canonicalInput,
          algorithm: "HMAC-SHA256",
          secretKey: hmacAltKey,
          signature: defaultResult.signature,
        });

        expect(ok).toBe(false);
      });

      test("Ed25519 はキーが変われば署名が変わる", async () => {
        const canonicalInput = canonicalRequestCases[0]?.input[0];

        if (!canonicalInput) {
          throw new Error("Canonical request not found: base[0]");
        }

        const defaultResult = await createSignature({
          ...canonicalInput,
          algorithm: "Ed25519",
          privateKey: ed25519DefaultPrivateKey,
        });
        const altResult = await createSignature({
          ...canonicalInput,
          algorithm: "Ed25519",
          privateKey: ed25519AltPrivateKey,
        });

        expect(defaultResult.signature).not.toBe(altResult.signature);
      });

      test("Ed25519 はキーが変われば検証に失敗する", async () => {
        const canonicalInput = canonicalRequestCases[0]?.input[0];

        if (!canonicalInput) {
          throw new Error("Canonical request not found: base[0]");
        }

        const defaultResult = await createSignature({
          ...canonicalInput,
          algorithm: "Ed25519",
          privateKey: ed25519DefaultPrivateKey,
        });
        const ok = await verifySignature({
          ...canonicalInput,
          algorithm: "Ed25519",
          publicKey: ed25519AltPublicKey,
          signature: defaultResult.signature,
        });

        expect(ok).toBe(false);
      });
    });
  });
}
