import {
  formatDateTime,
  normalizeAndValidateHeaders,
  parseDateTime,
  normalizeQueryString,
} from "./helpers";
import type {
  CanonicalRequestInput,
  CreateSignatureInput,
  CreateSignatureInputEd25519,
  CreateSignatureInputHmac,
  JwkPrivateKey,
  JwkPublicKey,
  PayloadInput,
  SecretKeyInput,
  SignatureAlgorithm,
  SignatureResult,
  VerifySignatureInput,
  VerifySignatureInputEd25519,
  VerifySignatureInputHmac,
} from "./types";

const ALGORITHM = "HMAC-SHA256" as const;
const ED25519_ALGORITHM = "Ed25519" as const;
const REQUIRED_SIGNED_HEADERS = ["content-type", "host"] as const;
const REQUIRED_SIGNED_HEADERS_ED25519 = [
  ...REQUIRED_SIGNED_HEADERS,
  "x-websign-nonce",
] as const;
const SECRET_KEY_PREFIX = "WebSignature";
const SIGNING_KEY_APPEND = "websignature_request";
const textEncoder = new TextEncoder();

type SignatureCrypto = {
  sha256Hex(input: Exclude<PayloadInput, null>): Promise<string> | string;
  hmacSha256(
    secretKey: Uint8Array,
    data: Uint8Array,
  ): Promise<Uint8Array> | Uint8Array;
  ed25519Sign(
    privateKey: JwkPrivateKey,
    data: Uint8Array,
  ): Promise<Uint8Array> | Uint8Array;
  ed25519Verify(
    publicKey: JwkPublicKey,
    data: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> | boolean;
};

type SigningMaterial = {
  stringToSign: string;
  signedHeaders: string;
  credentialTime: string;
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

function fromHex(hex: string): Uint8Array | null {
  const normalized = hex.trim();
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    return null;
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    return null;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const merged = new Uint8Array(left.byteLength + right.byteLength);
  merged.set(left);
  merged.set(right, left.byteLength);
  return merged;
}

function toSecretKeyBytes(secretKey: SecretKeyInput): Uint8Array {
  if (typeof secretKey === "string") {
    return textEncoder.encode(SECRET_KEY_PREFIX + secretKey);
  }

  const prefixBytes = textEncoder.encode(SECRET_KEY_PREFIX);
  if (secretKey instanceof Uint8Array) {
    return concatBytes(prefixBytes, secretKey);
  }
  return concatBytes(prefixBytes, new Uint8Array(secretKey));
}

async function buildSigningMaterial(
  input: CanonicalRequestInput & { algorithm: SignatureAlgorithm },
  crypto: SignatureCrypto,
): Promise<SigningMaterial> {
  const credentialTime = toCredentialTime(input.credentialTime);

  const requiredSignedHeaders =
    input.algorithm === ED25519_ALGORITHM
      ? REQUIRED_SIGNED_HEADERS_ED25519
      : REQUIRED_SIGNED_HEADERS;

  const { canonicalHeaders, canonicalSignedHeaders } =
    normalizeAndValidateHeaders(
      input.headers,
      input.signedHeaders,
      requiredSignedHeaders,
    );

  const normalizedQuery = normalizeQueryString(
    input.query ?? new URLSearchParams(),
  );
  const payloadHash = await crypto.sha256Hex(input.payload ?? "");
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.path,
    normalizedQuery,
    canonicalHeaders,
    "", // Empty line after headers
    canonicalSignedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = await crypto.sha256Hex(canonicalRequest);
  const stringToSign = [
    input.algorithm,
    credentialTime,
    input.serviceScope,
    canonicalRequestHash,
  ].join("\n");

  return {
    stringToSign,
    signedHeaders: canonicalSignedHeaders,
    credentialTime,
  };
}

async function signHmac(
  input: CreateSignatureInputHmac,
  material: SigningMaterial,
  crypto: SignatureCrypto,
): Promise<string> {
  let signingKey = toSecretKeyBytes(input.secretKey);
  const signingKeyParts = [
    material.credentialTime,
    ...input.serviceScope.split("/").reverse(),
    SIGNING_KEY_APPEND,
  ];

  for (const part of signingKeyParts) {
    const partKey = textEncoder.encode(part);
    signingKey = new Uint8Array(await crypto.hmacSha256(signingKey, partKey));
  }

  const data = textEncoder.encode(material.stringToSign);
  const signatureBytes = await crypto.hmacSha256(signingKey, data);
  return toHex(signatureBytes);
}

async function signEd25519(
  input: CreateSignatureInputEd25519,
  material: SigningMaterial,
  crypto: SignatureCrypto,
): Promise<string> {
  const data = textEncoder.encode(material.stringToSign);
  const signatureBytes = await crypto.ed25519Sign(input.privateKey, data);
  return toHex(signatureBytes);
}

async function verifyHmac(
  input: VerifySignatureInputHmac,
  material: SigningMaterial,
  crypto: SignatureCrypto,
  compare: (expected: string, actual: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  const expected = await signHmac(input, material, crypto);
  return compare(expected, input.signature.toLowerCase());
}

async function verifyEd25519(
  input: VerifySignatureInputEd25519,
  material: SigningMaterial,
  crypto: SignatureCrypto,
): Promise<boolean> {
  const signatureBytes = fromHex(input.signature);
  if (!signatureBytes) {
    return false;
  }
  const data = textEncoder.encode(material.stringToSign);
  return crypto.ed25519Verify(input.publicKey, data, signatureBytes);
}

export async function createSignatureBase(
  input: CreateSignatureInput,
  crypto: SignatureCrypto,
): Promise<SignatureResult> {
  const material = await buildSigningMaterial(input, crypto);
  let signature: string;
  switch (input.algorithm) {
    case ALGORITHM:
      signature = await signHmac(input, material, crypto);
      break;
    case ED25519_ALGORITHM:
      signature = await signEd25519(input, material, crypto);
      break;
    default:
      throw new Error(
        `Unsupported algorithm: ${(input as { algorithm: unknown }).algorithm}.`,
      );
  }

  return {
    algorithm: input.algorithm,
    credentialTime: material.credentialTime,
    signedHeaders: material.signedHeaders,
    signature,
  };
}

export async function verifySignatureBase(
  input: VerifySignatureInput,
  crypto: SignatureCrypto,
  compare: (expected: string, actual: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  const material = await buildSigningMaterial(input, crypto);
  switch (input.algorithm) {
    case ALGORITHM:
      return verifyHmac(input, material, crypto, compare);
    case ED25519_ALGORITHM:
      return verifyEd25519(input, material, crypto);
    default:
      throw new Error(
        `Unsupported algorithm: ${(input as { algorithm: unknown }).algorithm}.`,
      );
  }
}
