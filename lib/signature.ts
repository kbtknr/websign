import {
  formatDateTime,
  normalizeHeaders,
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

export type SignatureCrypto = {
  sha256Hex(input: Exclude<PayloadInput, null>): Promise<string> | string;
  hmacSha256(
    secretKey: Uint8Array,
    data: Uint8Array,
  ): Promise<Uint8Array> | Uint8Array;
};

function toCredentialTime(input: string | Date): string {
  if (typeof input === "string") {
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
    canonicalRequestHash,
  ].join("\n");
  const secretKey = new TextEncoder().encode(params.secretKey);
  const data = new TextEncoder().encode(stringToSign);
  const signatureBytes = await crypto.hmacSha256(secretKey, data);
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
