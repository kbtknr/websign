export type HeaderRecord = Record<string, string | ReadonlyArray<string>>;

export type NormalizeHeadersInput =
  | Headers
  | HeaderRecord
  | Iterable<[string, string | ReadonlyArray<string>]>;

export type PayloadInput = string | ArrayBuffer | Uint8Array | null;
export type JwkPrivateKey = Record<string, unknown>;
export type JwkPublicKey = Record<string, unknown>;
export type SecretKeyInput = string | ArrayBuffer | Uint8Array;

export type SignatureAlgorithm = "HMAC-SHA256" | "Ed25519";

export interface CanonicalRequestInput<TPayload = PayloadInput> {
  method: string;
  path: string;
  query?: URLSearchParams;
  headers: NormalizeHeadersInput;
  signedHeaders: ReadonlyArray<string>;
  nonceHeader?: string;
  payload?: TPayload;
  credentialTime: string | Date;
  serviceScope: string;
}

export interface CreateSignatureInputHmac<
  TPayload = PayloadInput,
> extends CanonicalRequestInput<TPayload> {
  algorithm: "HMAC-SHA256";
  secretKey: SecretKeyInput;
}

export interface CreateSignatureInputEd25519<
  TPayload = PayloadInput,
> extends CanonicalRequestInput<TPayload> {
  algorithm: "Ed25519";
  privateKey: JwkPrivateKey;
}

export type CreateSignatureInput<TPayload = PayloadInput> =
  | CreateSignatureInputHmac<TPayload>
  | CreateSignatureInputEd25519<TPayload>;

export interface VerifySignatureInputHmac<
  TPayload = PayloadInput,
> extends CanonicalRequestInput<TPayload> {
  algorithm: "HMAC-SHA256";
  secretKey: SecretKeyInput;
  signature: string;
}

export interface VerifySignatureInputEd25519<
  TPayload = PayloadInput,
> extends CanonicalRequestInput<TPayload> {
  algorithm: "Ed25519";
  publicKey: JwkPublicKey;
  signature: string;
}

export type VerifySignatureInput<TPayload = PayloadInput> =
  | VerifySignatureInputHmac<TPayload>
  | VerifySignatureInputEd25519<TPayload>;

export interface SignatureResult {
  algorithm: SignatureAlgorithm;
  credentialTime: string;
  signedHeaders: string;
  signature: string;
}
