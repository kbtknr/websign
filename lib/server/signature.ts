import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  PayloadInput,
  SignatureInput,
  VerifySignatureInput,
} from "../types";
import {
  createSignature as createSignatureBase,
  verifySignature as verifySignatureBase,
} from "../signature";

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

function hmacSha256Hex(secretKey: string, data: string): string {
  return createHmac("sha256", Buffer.from(secretKey, "utf8"))
    .update(data, "utf8")
    .digest("hex");
}

const cryptoImpl = {
  sha256Hex,
  hmacSha256Hex,
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

export async function createSignature(input: SignatureInput) {
  return createSignatureBase(input, cryptoImpl);
}

export async function verifySignature(
  input: VerifySignatureInput,
): Promise<boolean> {
  return verifySignatureBase(input, cryptoImpl, timingSafeEqualHex);
}
