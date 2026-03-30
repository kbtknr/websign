import type { JwkPrivateKey, JwkPublicKey } from "../../lib/types";

export const hmacDefaultKey = "test-secret-key";
export const hmacAltKey = "test-secret-key2";

export const ed25519DefaultPrivateKey: JwkPrivateKey = {
  crv: "Ed25519",
  d: "0d8Zgs_AaRI4pzw4ZhTIzd6Gfcc3DEe04VBAsUsdY1E",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

export const ed25519DefaultPublicKey: JwkPublicKey = {
  crv: "Ed25519",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

export const ed25519AltPrivateKey: JwkPrivateKey = {
  crv: "Ed25519",
  d: "1WKp--oM9BoZTlj_2n49Iqsb3eYNRf5EMMFl-tlguL4",
  x: "KcmNgD8SIxfTcBzn5Bg27hvjvA82LoDWlIeFSbATu1I",
  kty: "OKP",
};

export const ed25519AltPublicKey: JwkPublicKey = {
  crv: "Ed25519",
  x: "KcmNgD8SIxfTcBzn5Bg27hvjvA82LoDWlIeFSbATu1I",
  kty: "OKP",
};
