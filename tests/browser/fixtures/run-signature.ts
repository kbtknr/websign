import {
  createSignature as createBrowserSignature,
  verifySignature as verifyBrowserSignature,
} from "../../../lib/browser/signature";
import { signaturePatterns } from "../../shared/signature-case";

type PatternName = (typeof signaturePatterns)[number]["name"];

const patternMap = new Map(
  signaturePatterns.map((pattern) => [pattern.name, pattern.input]),
);

function getPatternInput(name: PatternName) {
  const input = patternMap.get(name);
  if (!input) {
    throw new Error(`Unknown signature pattern: ${name}`);
  }
  return input;
}

declare global {
  interface Window {
    __browserSignature: {
      createByName(
        name: PatternName,
      ): ReturnType<typeof createBrowserSignature>;
      verifyByName(
        name: PatternName,
        signature: string,
      ): ReturnType<typeof verifyBrowserSignature>;
    };
  }
}

window.__browserSignature = {
  createByName(name) {
    return createBrowserSignature(getPatternInput(name));
  },
  verifyByName(name, signature) {
    return verifyBrowserSignature({
      ...getPatternInput(name),
      signature,
    });
  },
};
