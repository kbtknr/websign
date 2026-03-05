export type HeaderRecord = Record<string, string | ReadonlyArray<string>>;

export type NormalizeHeadersInput =
  | Headers
  | HeaderRecord
  | Iterable<[string, string | ReadonlyArray<string>]>;

export type PayloadInput = string | ArrayBuffer | Uint8Array | null;
export type SecretKeyInput = string | ArrayBuffer | Uint8Array;

export type SignatureAlgorithm = "HMAC-SHA256";

export interface CanonicalRequestInput<TPayload = PayloadInput> {
  method: string;
  path: string;
  query?: URLSearchParams;
  headers: NormalizeHeadersInput;
  signedHeaders: ReadonlyArray<string>;
  payload?: TPayload;
  credentialTime: string | Date;
  serviceScope: string;
}

export interface CreateSignatureInput<
  TPayload = PayloadInput,
> extends CanonicalRequestInput<TPayload> {
  algorithm: SignatureAlgorithm;
  secretKey: SecretKeyInput;
}

export interface VerifySignatureInput<
  TPayload = PayloadInput,
> extends CreateSignatureInput<TPayload> {
  signature: string;
}

export interface SignatureResult {
  algorithm: SignatureAlgorithm;
  credentialTime: string;
  signedHeaders: string;
  signature: string;
}
