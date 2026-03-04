import {
  formatDateTime,
  normalizeAndValidateHeaders,
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

const ALGORITHM: SignatureAlgorithm = "HMAC-SHA256";
const REQUIRED_SIGNED_HEADERS = ["content-type", "host"] as const;
const SECRET_KEY_PREFIX = "WebSignature";
const SIGNING_KEY_APPEND = "websignature_request";
const textEncoder = new TextEncoder();

type SignatureCrypto = {
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

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const merged = new Uint8Array(left.byteLength + right.byteLength);
  merged.set(left);
  merged.set(right, left.byteLength);
  return merged;
}

function toSecretKeyBytes(secretKey: SignatureInput["secretKey"]): Uint8Array {
  if (typeof secretKey === "string") {
    return textEncoder.encode(SECRET_KEY_PREFIX + secretKey);
  }

  const prefixBytes = textEncoder.encode(SECRET_KEY_PREFIX);
  if (secretKey instanceof Uint8Array) {
    return concatBytes(prefixBytes, secretKey);
  }
  return concatBytes(prefixBytes, new Uint8Array(secretKey));
}

async function computeSignature(
  params: SignatureInput,
  crypto: SignatureCrypto,
): Promise<{
  signature: string;
  signedHeaders: string;
  credentialTime: string;
}> {
  const credentialTime = toCredentialTime(params.credentialTime);

  const { canonicalHeaders, canonicalSignedHeaders } =
    normalizeAndValidateHeaders(
      params.headers,
      params.signedHeaders,
      REQUIRED_SIGNED_HEADERS,
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

  let signingKey = toSecretKeyBytes(params.secretKey);
  const signingKeyParts = [
    credentialTime,
    ...params.serviceScope.split("/").reverse(),
    SIGNING_KEY_APPEND,
  ];
  for (const part of signingKeyParts) {
    const partKey = textEncoder.encode(part);
    signingKey = new Uint8Array(await crypto.hmacSha256(signingKey, partKey));
  }

  const data = textEncoder.encode(stringToSign);
  const signatureBytes = await crypto.hmacSha256(signingKey, data);
  const signature = toHex(signatureBytes);

  return { signature, signedHeaders: canonicalSignedHeaders, credentialTime };
}

export async function createSignatureBase(
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

export async function verifySignatureBase(
  input: VerifySignatureInput,
  crypto: SignatureCrypto,
  compare: (expected: string, actual: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  const { signature } = await computeSignature(input, crypto);
  return compare(signature, input.signature.toLowerCase());
}
