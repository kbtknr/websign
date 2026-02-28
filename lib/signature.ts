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
  hmacSha256Hex(secretKey: string, data: string): Promise<string> | string;
};

function toCredentialTime(input: string | Date): string {
  if (typeof input === "string") {
    return input;
  }
  return formatDateTime(input);
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
  const signature = await crypto.hmacSha256Hex(params.secretKey, stringToSign);

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
