import {
  formatDateTime,
  normalizeHeaders,
  normalizeQueryString,
  parseDateTime,
} from "./helpers";
import type {
  PayloadInput,
  SignatureAlgorithm,
  SignatureInput,
  SignatureResult,
  VerifySignatureInput,
} from "./types";

export const ALGORITHM: SignatureAlgorithm = "HMAC-SHA256";

type ComputeSignatureInput = Omit<SignatureInput, "credentialTime"> & {
  credentialTime: string;
};

export type SignatureCrypto = {
  sha256Hex(input: Exclude<PayloadInput, null>): Promise<string> | string;
  hmacSha256Hex(secretKey: string, data: string): Promise<string> | string;
};

function buildSignedHeaders(normalizedHeaders: string): string {
  if (!normalizedHeaders) return "";
  return normalizedHeaders
    .split("\n")
    .map((line) => line.split(":")[0])
    .filter(Boolean)
    .join(";");
}

export function toCredentialTime(value: Date | string): string {
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  parseDateTime(value);
  return value;
}

export async function computeSignature(
  params: ComputeSignatureInput,
  crypto: SignatureCrypto,
): Promise<{ signature: string; signedHeaders: string }> {
  const normalizedHeaders = normalizeHeaders(params.headers);
  const signedHeaders = buildSignedHeaders(normalizedHeaders);
  const normalizedQuery = normalizeQueryString(
    params.query ?? new URLSearchParams(),
  );
  const payloadHash = await crypto.sha256Hex(params.payload ?? "");
  const canonicalRequest = [
    params.method.toUpperCase(),
    params.path,
    normalizedQuery,
    normalizedHeaders,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = await crypto.sha256Hex(canonicalRequest);
  const stringToSign = [
    ALGORITHM,
    params.credentialTime,
    canonicalRequestHash,
  ].join("\n");
  const signature = await crypto.hmacSha256Hex(params.secretKey, stringToSign);

  return { signature, signedHeaders };
}

export async function createSignature(
  input: SignatureInput,
  crypto: SignatureCrypto,
): Promise<SignatureResult> {
  const credentialTime = formatDateTime(input.credentialTime ?? new Date());
  const { signature, signedHeaders } = await computeSignature(
    {
      ...input,
      credentialTime,
    },
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
  const credentialTime = toCredentialTime(input.credentialTime);
  const { signature } = await computeSignature(
    {
      ...input,
      credentialTime,
    },
    crypto,
  );
  return compare(signature, input.signature.toLowerCase());
}
