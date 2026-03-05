import type { CreateSignatureInput } from "../../lib/types";

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
  secretKey: string;
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
  secretKey: "test-secret-key",
};

export type SignaturePattern = {
  name: string;
  input: CreateSignatureInput;
};

function createBasePatternInput(): CreateSignatureInput {
  return {
    algorithm: "HMAC-SHA256",
    method: signatureCase.method,
    path: signatureCase.path,
    query: new URLSearchParams(signatureCase.query),
    headers: { ...signatureCase.headers },
    signedHeaders: signatureCase.signedHeaders,
    payload: signatureCase.payload,
    credentialTime: new Date(signatureCase.credentialTime),
    serviceScope: signatureCase.serviceScope,
    secretKey: signatureCase.secretKey,
  };
}

export const signaturePatterns: SignaturePattern[] = [
  { name: "base", input: createBasePatternInput() },
  {
    name: "method-changed",
    input: { ...createBasePatternInput(), method: "PUT" },
  },
  {
    name: "path-changed",
    input: { ...createBasePatternInput(), path: "/v1/messages/1" },
  },
  {
    name: "query-changed",
    input: {
      ...createBasePatternInput(),
      query: new URLSearchParams({
        ...signatureCase.query,
        token: "abc124",
      }),
    },
  },
  {
    name: "header-value-changed",
    input: {
      ...createBasePatternInput(),
      headers: {
        ...signatureCase.headers,
        "X-Request-Id": "req-0002",
      },
    },
  },
  {
    name: "payload-changed",
    input: {
      ...createBasePatternInput(),
      payload: '{"message":"hello world"}',
    },
  },
  {
    name: "credential-time-changed",
    input: {
      ...createBasePatternInput(),
      credentialTime: new Date("2025-01-01T00:00:01.000Z"),
    },
  },
  {
    name: "secret-key-changed",
    input: {
      ...createBasePatternInput(),
      secretKey: "test-secret-key-2",
    },
  },
  {
    name: "payload-null",
    input: {
      ...createBasePatternInput(),
      payload: null,
    },
  },
  {
    name: "query-empty",
    input: {
      ...createBasePatternInput(),
      query: new URLSearchParams(),
    },
  },
];
