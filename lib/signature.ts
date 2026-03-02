import {
  formatDateTime,
  normalizeHeaders,
  parseDateTime,
  normalizeQueryString,
} from "./helpers";
import type {
  PayloadInput,
  SignatureAlgorithm,
  SignatureInput,
  SignatureResult,
  VerifySignatureInput,
} from "./types";

export const ALGORITHM: SignatureAlgorithm = "HMAC-SHA256";
const SECRET_KEY_PREFIX = "WebSignature";
const SIGNING_KEY_APPEND = "websignature_request";

export type SignatureCrypto = {
  sha256Hex(input: Exclude<PayloadInput, null>): Promise<string> | string;
  hmacSha256(
    secretKey: Uint8Array,
    data: Uint8Array,
  ): Promise<Uint8Array> | Uint8Array;
};

function toCredentialTime(input: string | Date): string {
  if (typeof input === "string") {
    parseDateTime(input);
    return input;
  }
  return formatDateTime(input);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function computeSignature(
  params: SignatureInput,
  crypto: SignatureCrypto,
): Promise<{
  signature: string;
  signedHeaders: string;
  credentialTime: string;
}> {
  const credentialTime = toCredentialTime(params.credentialTime);
  const { canonicalHeaders, canonicalSignedHeaders } = normalizeHeaders(
    params.headers,
    params.signedHeaders,
  );
  const normalizedQuery = normalizeQueryString(
    params.query ?? new URLSearchParams(),
  );
  const payloadHash = await crypto.sha256Hex(params.payload ?? "");
  const canonicalRequest = [
    params.method.toUpperCase(),
    params.path,
    normalizedQuery,
    canonicalHeaders,
    "", // Empty line after headers
    canonicalSignedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = await crypto.sha256Hex(canonicalRequest);
  const stringToSign = [
    ALGORITHM,
    credentialTime,
    params.serviceScope,
    canonicalRequestHash,
  ].join("\n");

  let signingKey = new TextEncoder().encode(
    SECRET_KEY_PREFIX + params.secretKey,
  );
  const signingKeyParts = [
    credentialTime,
    ...params.serviceScope.split("/").reverse(),
    SIGNING_KEY_APPEND,
  ];
  for (const part of signingKeyParts) {
    const partKey = new TextEncoder().encode(part);
    signingKey = new Uint8Array(await crypto.hmacSha256(signingKey, partKey));
  }

  const data = new TextEncoder().encode(stringToSign);
  const signatureBytes = await crypto.hmacSha256(signingKey, data);
  const signature = toHex(signatureBytes);

  return { signature, signedHeaders: canonicalSignedHeaders, credentialTime };
}

export async function createSignature(
  input: SignatureInput,
  crypto: SignatureCrypto,
): Promise<SignatureResult> {
  const { signature, signedHeaders, credentialTime } = await computeSignature(
    input,
    crypto,
  );

  return {
    algorithm: ALGORITHM,
    credentialTime,
    signedHeaders,
    signature,
  };
}

export async function verifySignature(
  input: VerifySignatureInput,
  crypto: SignatureCrypto,
  compare: (expected: string, actual: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  const { signature } = await computeSignature(input, crypto);
  return compare(signature, input.signature.toLowerCase());
}
