import type {
  CanonicalRequestInput,
  JwkPrivateKey,
  JwkPublicKey,
  SecretKeyInput,
} from "../../lib/types";

export type SignatureCase = {
  name: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  headers: Record<string, string>;
  signedHeaders: ReadonlyArray<string>;
  payload?: string | null;
  credentialTime: string;
  serviceScope: string;
};

export const signatureCase: SignatureCase = {
  name: "basic-request",
  method: "POST",
  path: "/v1/messages",
  query: {
    locale: "ja-JP",
    token: "abc123",
  },
  headers: {
    Host: "api.example.com",
    "Content-Type": "application/json",
    "X-Request-Id": "req-0001",
  },
  signedHeaders: ["host", "content-type", "x-request-id"],
  payload: '{"message":"hello"}',
  credentialTime: "2025-01-01T00:00:00.000Z",
  serviceScope: "messaging/v1",
};

export type CanonicalBuildPattern = {
  name: string;
  input: CanonicalRequestInput;
};

function createBaseCanonicalInput(): CanonicalRequestInput {
  return {
    method: signatureCase.method,
    path: signatureCase.path,
    query: new URLSearchParams(signatureCase.query),
    headers: { ...signatureCase.headers },
    signedHeaders: signatureCase.signedHeaders,
    payload: signatureCase.payload,
    credentialTime: new Date(signatureCase.credentialTime),
    serviceScope: signatureCase.serviceScope,
  };
}

export const canonicalBuildPatterns: CanonicalBuildPattern[] = [
  { name: "base", input: createBaseCanonicalInput() },
  {
    name: "method-changed",
    input: { ...createBaseCanonicalInput(), method: "PUT" },
  },
  {
    name: "path-changed",
    input: { ...createBaseCanonicalInput(), path: "/v1/messages/1" },
  },
  {
    name: "query-changed",
    input: {
      ...createBaseCanonicalInput(),
      query: new URLSearchParams({
        ...signatureCase.query,
        token: "abc124",
      }),
    },
  },
  {
    name: "header-value-changed",
    input: {
      ...createBaseCanonicalInput(),
      headers: {
        ...signatureCase.headers,
        "X-Request-Id": "req-0002",
      },
    },
  },
  {
    name: "payload-changed",
    input: {
      ...createBaseCanonicalInput(),
      payload: '{"message":"hello world"}',
    },
  },
  {
    name: "credential-time-changed",
    input: {
      ...createBaseCanonicalInput(),
      credentialTime: new Date("2025-01-01T00:00:01.000Z"),
    },
  },
  {
    name: "payload-null",
    input: {
      ...createBaseCanonicalInput(),
      payload: null,
    },
  },
  {
    name: "query-empty",
    input: {
      ...createBaseCanonicalInput(),
      query: new URLSearchParams(),
    },
  },
];

type HmacAlgorithmKeyPattern = {
  name: string;
  createInput: {
    algorithm: "HMAC-SHA256";
    secretKey: SecretKeyInput;
  };
  verifyInput: {
    algorithm: "HMAC-SHA256";
    secretKey: SecretKeyInput;
  };
};

type Ed25519AlgorithmKeyPattern = {
  name: string;
  createInput: {
    algorithm: "Ed25519";
    privateKey: JwkPrivateKey;
  };
  verifyInput: {
    algorithm: "Ed25519";
    publicKey: JwkPublicKey;
  };
};

export type AlgorithmKeyPattern =
  | HmacAlgorithmKeyPattern
  | Ed25519AlgorithmKeyPattern;

const ed25519PrivateKey: JwkPrivateKey = {
  crv: "Ed25519",
  d: "0d8Zgs_AaRI4pzw4ZhTIzd6Gfcc3DEe04VBAsUsdY1E",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

const ed25519PublicKey: JwkPublicKey = {
  crv: "Ed25519",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

export const algorithmKeyPatterns: AlgorithmKeyPattern[] = [
  {
    name: "hmac-default-key",
    createInput: {
      algorithm: "HMAC-SHA256",
      secretKey: "test-secret-key",
    },
    verifyInput: {
      algorithm: "HMAC-SHA256",
      secretKey: "test-secret-key",
    },
  },
  {
    name: "hmac-alt-key",
    createInput: {
      algorithm: "HMAC-SHA256",
      secretKey: "test-secret-key-2",
    },
    verifyInput: {
      algorithm: "HMAC-SHA256",
      secretKey: "test-secret-key-2",
    },
  },
  {
    name: "ed25519-default-key",
    createInput: {
      algorithm: "Ed25519",
      privateKey: ed25519PrivateKey,
    },
    verifyInput: {
      algorithm: "Ed25519",
      publicKey: ed25519PublicKey,
    },
  },
];

export type SignatureTestCase = {
  name: string;
  canonical: CanonicalRequestInput;
  signer: AlgorithmKeyPattern;
};

export const signatureTestCases: SignatureTestCase[] = canonicalBuildPatterns.flatMap(
  (canonicalPattern) =>
    algorithmKeyPatterns.map((signer) => ({
      name: `${canonicalPattern.name}__${signer.name}`,
      canonical: canonicalPattern.input,
      signer,
    })),
);
