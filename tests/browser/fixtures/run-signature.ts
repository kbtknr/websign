import {
  createSignature as createBrowserSignature,
  verifySignature as verifyBrowserSignature,
} from "../../../lib/browser/signature";

type BrowserSignatureInput = {
  method: string;
  path: string;
  query?: Record<string, string>;
  headers: Record<string, string>;
  payload?: string | null;
  credentialTime: string;
  secretKey: string;
};

type BrowserVerifyInput = BrowserSignatureInput & {
  signature: string;
};

declare global {
  interface Window {
    __browserSignature: {
      create(
        input: BrowserSignatureInput,
      ): ReturnType<typeof createBrowserSignature>;
      verify(
        input: BrowserVerifyInput,
      ): ReturnType<typeof verifyBrowserSignature>;
    };
  }
}

window.__browserSignature = {
  create(input) {
    return createBrowserSignature({
      ...input,
      query: new URLSearchParams(input.query),
      credentialTime: new Date(input.credentialTime),
    });
  },
  verify(input) {
    return verifyBrowserSignature({
      ...input,
      query: new URLSearchParams(input.query),
      credentialTime: new Date(input.credentialTime),
    });
  },
};
