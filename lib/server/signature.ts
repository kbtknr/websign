import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  PayloadInput,
  SignatureInput,
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

const cryptoImpl = {
  sha256Hex,
  hmacSha256,
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
