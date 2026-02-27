import type {
  PayloadInput,
  SignatureInput,
  VerifySignatureInput,
} from "../types";
import {
  createSignature as createSignatureBase,
  verifySignature as verifySignatureBase,
} from "../signature";

function toBytes(input: Exclude<PayloadInput, null>): Uint8Array {
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256Hex(
  input: string | ArrayBuffer | Uint8Array,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(input));
  return toHex(new Uint8Array(digest));
}

async function hmacSha256Hex(secretKey: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toBytes(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, toBytes(data));
  return toHex(new Uint8Array(signature));
}

const cryptoImpl = {
  sha256Hex,
  hmacSha256Hex,
};

function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSignature(input: SignatureInput) {
  return createSignatureBase(input, cryptoImpl);
}

export async function verifySignature(
  input: VerifySignatureInput,
): Promise<boolean> {
  return verifySignatureBase(input, cryptoImpl, timingSafeEqualHex);
}
