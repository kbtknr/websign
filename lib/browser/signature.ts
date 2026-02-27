import type {
  PayloadInput,
  SignatureInput,
  VerifySignatureInput,
} from "../types";
import {
  createSignature as createSignatureBase,
  verifySignature as verifySignatureBase,
} from "../signature";

export type BrowserPayloadInput =
  | string
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | File
  | null;

function toBytes(input: Exclude<PayloadInput, null>): ArrayBuffer {
  const asArrayBuffer = (value: Uint8Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(value.byteLength);
    new Uint8Array(buffer).set(value);
    return buffer;
  };

  if (typeof input === "string") {
    return asArrayBuffer(new TextEncoder().encode(input));
  }
  if (input instanceof Uint8Array) {
    return asArrayBuffer(input);
  }
  return input;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256Hex(
  input: string | ArrayBuffer | Uint8Array,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(input));
  return toHex(digest);
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
  return toHex(signature);
}

const cryptoImpl = {
  sha256Hex,
  hmacSha256Hex,
};

async function normalizePayload(
  payload?: BrowserPayloadInput,
): Promise<PayloadInput | undefined> {
  if (payload === undefined) {
    return undefined;
  }
  if (payload === null || typeof payload === "string") {
    return payload;
  }
  if (payload instanceof ArrayBuffer) {
    return payload;
  }
  if (payload instanceof Blob) {
    return await payload.arrayBuffer();
  }
  if (ArrayBuffer.isView(payload)) {
    if (payload instanceof Uint8Array) {
      return payload;
    }
    const view = new Uint8Array(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );
    const copied = new Uint8Array(view.byteLength);
    copied.set(view);
    return copied;
  }
  return payload;
}

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

export async function createSignature(
  input: SignatureInput<BrowserPayloadInput>,
) {
  const payload = await normalizePayload(input.payload);
  return createSignatureBase({ ...input, payload }, cryptoImpl);
}

export async function verifySignature(
  input: VerifySignatureInput<BrowserPayloadInput>,
): Promise<boolean> {
  const payload = await normalizePayload(input.payload);
  return verifySignatureBase(
    { ...input, payload },
    cryptoImpl,
    timingSafeEqualHex,
  );
}
