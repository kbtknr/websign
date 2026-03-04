export type HeaderRecord = Record<string, string | ReadonlyArray<string>>;

export type NormalizeHeadersInput =
  | Headers
  | HeaderRecord
  | Iterable<[string, string | ReadonlyArray<string>]>;

export type PayloadInput = string | ArrayBuffer | Uint8Array | null;

export type SignatureAlgorithm = "HMAC-SHA256";

export interface SignatureInput<TPayload = PayloadInput> {
  method: string;
  path: string;
  query?: URLSearchParams;
  headers: NormalizeHeadersInput;
  signedHeaders: ReadonlyArray<string>;
  payload?: TPayload;
  credentialTime: string | Date;
  serviceScope: string;
  secretKey: string | ArrayBuffer | Uint8Array;
}

export interface VerifySignatureInput<
  TPayload = PayloadInput,
> extends SignatureInput<TPayload> {
  signature: string;
}

export interface SignatureResult {
  algorithm: SignatureAlgorithm;
  credentialTime: string;
  signedHeaders: string;
  signature: string;
}
