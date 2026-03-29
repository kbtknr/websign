import { JwkPrivateKey, JwkPublicKey } from "../../../lib/types";
import {
  createSignature,
  verifySignature as verifySignature,
} from "../../../lib/webcrypto/signature";
import { canonicalRequestCases } from "../../shared/canonical-requests";

function getCanonicalRequestCase(name: string, index: number) {
  const result =
    canonicalRequestCases.find((testCase) => testCase.name === name)?.input[
      index
    ] ?? undefined;
  if (result == null) {
    throw new Error(
      `Canonical request case not found: name=${name}, index=${index}`,
    );
  }
  return result;
}
declare global {
  interface Window {
    __browserSignature: {
      createHmac(args: {
        canonicalRequestName: string;
        canonicalRequestIndex?: number;
        signingKey: string;
      }): ReturnType<typeof createSignature>;
      verifyHmac(args: {
        canonicalRequestName: string;
        canonicalRequestIndex?: number;
        signingKey: string;
        signature: string;
      }): ReturnType<typeof verifySignature>;
      createEd25519(args: {
        canonicalRequestName: string;
        canonicalRequestIndex?: number;
        privateKey: JwkPrivateKey;
      }): ReturnType<typeof createSignature>;
      verifyEd25519(args: {
        canonicalRequestName: string;
        canonicalRequestIndex?: number;
        publicKey: JwkPublicKey;
        signature: string;
      }): ReturnType<typeof verifySignature>;
    };
  }
}

window.__browserSignature = {
  createHmac({ canonicalRequestName, canonicalRequestIndex = 0, signingKey }) {
    const canonicalRequestInput = getCanonicalRequestCase(
      canonicalRequestName,
      canonicalRequestIndex,
    );
    return createSignature({
      ...canonicalRequestInput,
      algorithm: "HMAC-SHA256",
      secretKey: signingKey,
    });
  },
  verifyHmac({
    canonicalRequestName,
    canonicalRequestIndex = 0,
    signingKey,
    signature,
  }) {
    const canonicalRequestInput = getCanonicalRequestCase(
      canonicalRequestName,
      canonicalRequestIndex,
    );
    return verifySignature({
      ...canonicalRequestInput,
      algorithm: "HMAC-SHA256",
      secretKey: signingKey,
      signature,
    });
  },
  createEd25519({
    canonicalRequestName,
    canonicalRequestIndex = 0,
    privateKey,
  }) {
    const canonicalRequestInput = getCanonicalRequestCase(
      canonicalRequestName,
      canonicalRequestIndex,
    );
    return createSignature({
      ...canonicalRequestInput,
      algorithm: "Ed25519",
      privateKey,
    });
  },
  verifyEd25519({
    canonicalRequestName,
    canonicalRequestIndex = 0,
    publicKey,
    signature,
  }) {
    const canonicalRequestInput = getCanonicalRequestCase(
      canonicalRequestName,
      canonicalRequestIndex,
    );
    return verifySignature({
      ...canonicalRequestInput,
      algorithm: "Ed25519",
      publicKey,
      signature,
    });
  },
};
