import type {
  CreateSignatureInput,
  PayloadInput,
  SignatureResult,
  VerifySignatureInput,
} from "../../lib/types.ts";
import {
  type SignatureVector,
  signatureVectors,
} from "../vectors/signature-vectors.ts";

type CreateSignature = (
  input: CreateSignatureInput<PayloadInput>,
) => Promise<SignatureResult>;

type VerifySignature = (
  input: VerifySignatureInput<PayloadInput>,
) => Promise<boolean>;

type Describe = (name: string, fn: () => void) => void;

type Test = (name: string, fn: () => Promise<void> | void) => void;

type Expect = (
  value: unknown,
  message?: string,
) => {
  toBe: (expected: unknown) => void;
};

function assertNever(value: never): never {
  throw new Error(`Unsupported signing algorithm: ${JSON.stringify(value)}`);
}

function createSignatureInputFromVector(
  vector: SignatureVector,
): CreateSignatureInput<PayloadInput> {
  switch (vector.signingKey.algorithm) {
    case "HMAC-SHA256":
      return {
        ...vector.canonicalRequestInput,
        algorithm: "HMAC-SHA256",
        secretKey: vector.signingKey.secretKey,
      };
    case "Ed25519":
      return {
        ...vector.canonicalRequestInput,
        algorithm: "Ed25519",
        privateKey: vector.signingKey.privateKey,
      };
    default:
      return assertNever(vector.signingKey);
  }
}

function createVerifyInputFromVector(
  vector: SignatureVector,
  signature: string,
): VerifySignatureInput<PayloadInput> {
  switch (vector.signingKey.algorithm) {
    case "HMAC-SHA256":
      return {
        ...vector.canonicalRequestInput,
        algorithm: "HMAC-SHA256",
        secretKey: vector.signingKey.secretKey,
        signature,
      };
    case "Ed25519":
      return {
        ...vector.canonicalRequestInput,
        algorithm: "Ed25519",
        publicKey: vector.signingKey.publicKey,
        signature,
      };
    default:
      return assertNever(vector.signingKey);
  }
}

export function createSignatureVectorSmokeSuite(
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

  describe(`${runtimeName} smoke`, () => {
    for (const vector of signatureVectors) {
      test(vector.name, async () => {
        const result = await createSignature(
          createSignatureInputFromVector(vector),
        );

        expect(result.credentialTime, `${vector.name}: credentialTime`).toBe(
          vector.expected.credentialTime,
        );
        expect(result.signedHeaders, `${vector.name}: signedHeaders`).toBe(
          vector.expected.signedHeaders,
        );
        expect(result.signature, `${vector.name}: signature`).toBe(
          vector.expected.signature,
        );

        expect(
          await verifySignature(
            createVerifyInputFromVector(vector, result.signature),
          ),
          `${vector.name}: verifySignature`,
        ).toBe(true);
      });
    }
  });
}
