export type HeaderPrimitive = string | number | boolean;

export type HeaderRecord = Record<string, HeaderPrimitive | null | undefined>;

export type NormalizeHeadersInput =
  | Headers
  | HeaderRecord
  | Iterable<[string, HeaderPrimitive]>;

export type PayloadInput = string | ArrayBuffer | Uint8Array | null;

export type SignatureAlgorithm = "HMAC-SHA256";

export interface SignatureInput {
  method: string;
  path: string;
  query?: URLSearchParams;
  headers: NormalizeHeadersInput;
  payload?: PayloadInput;
  credentialTime?: Date;
  secretKey: string;
}

export interface VerifySignatureInput extends SignatureInput {
  credentialTime: Date | string;
  signature: string;
}

export interface SignatureResult {
  algorithm: SignatureAlgorithm;
  credentialTime: string;
  signedHeaders: string;
  signature: string;
}
