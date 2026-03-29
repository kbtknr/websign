import type { CanonicalRequestInput } from "../../lib/types";

export type CanonicalRequestCase = {
  // Test case name
  name: string;
  // Multiple input values that produce the same signature result
  input: ReadonlyArray<CanonicalRequestInput>;
};

function createBaseCanonicalInput(): CanonicalRequestInput {
  return {
    method: "POST",
    path: "/v1/messages",
    query: new URLSearchParams("locale=ja-JP&token=abc123"),
    headers: {
      Host: "api.example.com",
      "Content-Type": "application/json",
      "X-Request-Id": "req-0001",
      "X-WebSign-Nonce": "nonce-0001",
    },
    nonceHeader: "x-websign-nonce",
    signedHeaders: ["host", "content-type", "x-request-id"],
    requiredSignedHeaders: ["host", "content-type"],
    payload: '{"message":"hello"}',
    credentialTime: new Date("2025-01-01T00:00:00.000Z"),
    serviceScope: "messaging/v1",
  };
}

export const canonicalRequestCases: CanonicalRequestCase[] = [
  {
    name: "base",
    input: [
      createBaseCanonicalInput(),
      {
        ...createBaseCanonicalInput(),
        query: new URLSearchParams("token=abc123&locale=ja-JP"),
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          host: " api.example.com ",
          "content-type": "application/json",
          "x-request-id": "req-0001",
          "x-websign-nonce": "nonce-0001",
        },
      },
      {
        ...createBaseCanonicalInput(),
        nonceHeader: " X-WebSign-Nonce ",
      },
      {
        ...createBaseCanonicalInput(),
        nonceHeader: undefined,
        signedHeaders: [
          "host",
          "content-type",
          "x-request-id",
          "x-websign-nonce",
        ],
        requiredSignedHeaders: ["host", "content-type", "x-websign-nonce"],
      },
      {
        ...createBaseCanonicalInput(),
        signedHeaders: [
          "X-Websign-Nonce",
          "x-request-id",
          "content-type",
          "  host  ",
        ],
        requiredSignedHeaders: ["host", "content-type", "x-websign-nonce"],
      },
    ],
  },
  {
    name: "method-changed",
    input: [{ ...createBaseCanonicalInput(), method: "PUT" }],
  },
  {
    name: "path-changed",
    input: [{ ...createBaseCanonicalInput(), path: "/v1/messages/1" }],
  },
  {
    name: "query-empty",
    input: [
      {
        ...createBaseCanonicalInput(),
        query: new URLSearchParams(),
      },
    ],
  },
  {
    name: "query-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        query: new URLSearchParams("locales=ja&token=abc123&locales=en"),
      },
      {
        ...createBaseCanonicalInput(),
        query: new URLSearchParams("locales=ja&locales=en&token=abc123"),
      },
    ],
  },
  {
    name: "header-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Request-Id": "req-0001",
          "X-WebSign-Nonce": "nonce-0001",
          Header1: "header-value1",
        },
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          host: "api.example.com",
          "content-type": "application/json",
          "x-request-id": "req-0001",
          "x-websign-nonce": "nonce-0001",
          header1: "header-value1",
        },
      },
    ],
  },
  {
    name: "header-value-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Request-Id": "req-0002",
          "X-WebSign-Nonce": "nonce-0002",
        },
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Request-Id": "req-0002",
          "X-WebSign-Nonce": "nonce-0002",
        },
      },
    ],
  },
  {
    name: "nonce-header-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Request-Id": "req-0001",
          "X-WebSign-Nonce": "nonce-0001",
          Header1: "header-value1",
        },
        nonceHeader: "header1",
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          host: "api.example.com",
          "content-type": "application/json",
          "x-request-id": "req-0001",
          // "x-websign-nonce": "nonce-0001",
          header1: "header-value1",
        },
        nonceHeader: "header1",
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          host: "api.example.com",
          "content-type": "application/json",
          "x-request-id": "req-0001",
          // "x-websign-nonce": "nonce-0001",
          header1: "header-value1",
        },
        nonceHeader: undefined,
        signedHeaders: ["host", "content-type", "x-request-id", "header1"],
      },
    ],
  },
  {
    name: "signed-headers-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Req-Id": "req-0001",
          "X-WebSign-Nonce": "nonce-0001",
          Header1: "header-value1",
        },
        signedHeaders: ["host", "content-type", "x-req-id"],
      },
      {
        ...createBaseCanonicalInput(),
        headers: {
          host: "api.example.com",
          "content-type": "application/json",
          "x-req-id": "req-0001",
          "x-websign-nonce": "nonce-0001",
          header2: "header-value2",
        },
        signedHeaders: ["host", "content-type", "x-req-id"],
      },
    ],
  },
  {
    name: "required-headers-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        requiredSignedHeaders: [],
      },
      {
        ...createBaseCanonicalInput(),
        requiredSignedHeaders: ["Host"],
      },
      {
        ...createBaseCanonicalInput(),
        requiredSignedHeaders: ["content-type"],
      },
    ],
  },
  {
    name: "payload-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        payload: '{"message":"hello world"}',
      },
    ],
  },
  {
    name: "payload-null",
    input: [
      {
        ...createBaseCanonicalInput(),
        payload: null,
      },
    ],
  },
  {
    name: "credential-time-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        credentialTime: new Date("2025-01-01T00:00:01.000Z"),
      },
      {
        ...createBaseCanonicalInput(),
        credentialTime: "20250101T000001Z",
      },
    ],
  },
  {
    name: "service-scope-changed",
    input: [
      {
        ...createBaseCanonicalInput(),
        serviceScope: "messaging/v2",
      },
    ],
  },
];
