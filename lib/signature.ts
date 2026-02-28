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

type ComputeSignatureInput = Omit<SignatureInput, "credentialTime"> & {
  credentialTime: string;
};

export type SignatureCrypto = {
  sha256Hex(input: Exclude<PayloadInput, null>): Promise<string> | string;
  hmacSha256Hex(secretKey: string, data: string): Promise<string> | string;
};

export async function computeSignature(
  params: ComputeSignatureInput,
  crypto: SignatureCrypto,
): Promise<{ signature: string; signedHeaders: string }> {
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
    "",
    canonicalSignedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = await crypto.sha256Hex(canonicalRequest);
  const stringToSign = [
    ALGORITHM,
    params.credentialTime,
    canonicalRequestHash,
  ].join("\n");
  const signature = await crypto.hmacSha256Hex(params.secretKey, stringToSign);

  return { signature, signedHeaders: canonicalSignedHeaders };
}

export async function createSignature(
  input: SignatureInput,
  crypto: SignatureCrypto,
): Promise<SignatureResult> {
  const credentialTime = formatDateTime(input.credentialTime);
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
  const credentialTime = formatDateTime(input.credentialTime);
  const { signature } = await computeSignature(
    {
      ...input,
      credentialTime,
    },
    crypto,
  );
  return compare(signature, input.signature.toLowerCase());
}
