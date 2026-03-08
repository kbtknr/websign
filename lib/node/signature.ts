import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";
import type { KeyObject } from "node:crypto";
import type {
  CreateSignatureInput,
  JwkPrivateKey,
  JwkPublicKey,
  PayloadInput,
  VerifySignatureInput,
} from "../types";
import { createSignatureBase, verifySignatureBase } from "../signature";

function toBuffer(input: Exclude<PayloadInput, null>): Buffer {
  if (typeof input === "string") {
    return Buffer.from(input, "utf8");
  }
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }
  return Buffer.from(input);
}

function sha256Hex(input: string | ArrayBuffer | Uint8Array): string {
  return createHash("sha256").update(toBuffer(input)).digest("hex");
}

function hmacSha256(secretKey: Uint8Array, data: Uint8Array): Uint8Array {
  return createHmac("sha256", Buffer.from(secretKey)).update(data).digest();
}

function toPrivateKey(input: JwkPrivateKey): KeyObject {
  return createPrivateKey({
    key: input,
    format: "jwk",
  });
}

function toPublicKey(input: JwkPublicKey): KeyObject {
  return createPublicKey({
    key: input,
    format: "jwk",
  });
}

function ed25519Sign(privateKey: JwkPrivateKey, data: Uint8Array): Uint8Array {
  return sign(null, Buffer.from(data), toPrivateKey(privateKey));
}

function ed25519Verify(
  publicKey: JwkPublicKey,
  data: Uint8Array,
  signature: Uint8Array,
): boolean {
  return verify(
    null,
    Buffer.from(data),
    toPublicKey(publicKey),
    Buffer.from(signature),
  );
}

const cryptoImpl = {
  sha256Hex,
  hmacSha256,
  ed25519Sign,
  ed25519Verify,
};

function timingSafeEqualHex(
  expectedSignature: string,
  actualSignature: string,
): boolean {
  const expected = Buffer.from(expectedSignature, "hex");
  const actual = Buffer.from(actualSignature, "hex");

  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export async function createSignature(input: CreateSignatureInput) {
  return createSignatureBase(input, cryptoImpl);
}

export async function verifySignature(
  input: VerifySignatureInput,
): Promise<boolean> {
  return verifySignatureBase(input, cryptoImpl, timingSafeEqualHex);
}
