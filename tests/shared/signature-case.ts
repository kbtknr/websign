export type SignatureCase = {
  name: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  headers: Record<string, string>;
  payload?: string | null;
  credentialTime: string;
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
    "Content-Type": "application/json",
    "X-Request-Id": "req-0001",
  },
  payload: '{"message":"hello"}',
  credentialTime: "2025-01-01T00:00:00.000Z",
  secretKey: "test-secret-key",
};
