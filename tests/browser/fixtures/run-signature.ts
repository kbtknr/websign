import {
  createSignature as createBrowserSignature,
  verifySignature as verifyBrowserSignature,
} from "../../../lib/browser/signature";
import { signatureTestCases } from "../../shared/signature-case";

type PatternName = (typeof signatureTestCases)[number]["name"];

const patternMap = new Map(
  signatureTestCases.map((testCase) => [testCase.name, testCase]),
);

function getPattern(name: PatternName) {
  const pattern = patternMap.get(name);
  if (!pattern) {
    throw new Error(`Unknown signature pattern: ${name}`);
  }
  return pattern;
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
    const pattern = getPattern(name);
    return createBrowserSignature({
      ...pattern.canonicalInput,
      ...pattern.signingKey.createInput,
    });
  },
  verifyByName(name, signature) {
    const pattern = getPattern(name);
    return verifyBrowserSignature({
      ...pattern.canonicalInput,
      ...pattern.signingKey.verifyInput,
      signature,
    });
  },
};
