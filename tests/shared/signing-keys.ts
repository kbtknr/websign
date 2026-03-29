import type { JwkPrivateKey, JwkPublicKey } from "../../lib/types";

export const hmacDefaultKey = "test-secret-key";
export const hmacAltKey = "test-secret-key2";

export const ed25519PrivateKey: JwkPrivateKey = {
  crv: "Ed25519",
  d: "0d8Zgs_AaRI4pzw4ZhTIzd6Gfcc3DEe04VBAsUsdY1E",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

export const ed25519PublicKey: JwkPublicKey = {
  crv: "Ed25519",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};
