import { expect, test, type Page } from "@playwright/test";
import {
  createSignature as createServerSignature,
  verifySignature as verifyServerSignature,
} from "../../lib/node/signature";
import { canonicalRequestCases } from "../shared/canonical-requests";
import {
  ed25519DefaultPublicKey,
  ed25519DefaultPrivateKey,
  hmacDefaultKey,
} from "../shared/signing-keys";

async function createBrowserHmacSignature(
  page: Page,
  canonicalRequestName: string,
  canonicalRequestIndex = 0,
) {
  return page.evaluate(
    async (value) => {
      return window.__browserSignature.createHmac(value);
    },
    {
      canonicalRequestName,
      canonicalRequestIndex,
      signingKey: hmacDefaultKey,
    },
  );
}

async function createBrowserEd25519Signature(
  page: Page,
  canonicalRequestName: string,
  canonicalRequestIndex = 0,
) {
  return page.evaluate(
    async (value) => {
      return window.__browserSignature.createEd25519(value);
    },
    {
      canonicalRequestName,
      canonicalRequestIndex,
      privateKey: ed25519DefaultPrivateKey,
    },
  );
}

test.describe("browser signature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/playwright/fixtures/index.html");
  });

  test.describe("サーバ一致", () => {
    for (const testCase of canonicalRequestCases) {
      test(`HMAC: ${testCase.name}`, async ({ page }) => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const browserResult = await createBrowserHmacSignature(
            page,
            testCase.name,
            index,
          );
          const serverResult = await createServerSignature({
            ...canonicalInput,
            algorithm: "HMAC-SHA256",
            secretKey: hmacDefaultKey,
          });

          expect(
            browserResult.signature,
            `HMAC signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.signature);
          expect(
            browserResult.algorithm,
            `HMAC algorithm mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.algorithm);
          expect(
            browserResult.signedHeaders,
            `HMAC signedHeaders mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.signedHeaders);
        }
      });
    }

    for (const testCase of canonicalRequestCases) {
      test(`Ed25519: ${testCase.name}`, async ({ page }) => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const browserResult = await createBrowserEd25519Signature(
            page,
            testCase.name,
            index,
          );
          const serverResult = await createServerSignature({
            ...canonicalInput,
            algorithm: "Ed25519",
            privateKey: ed25519DefaultPrivateKey,
          });

          expect(
            browserResult.signature,
            `Ed25519 signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.signature);
          expect(
            browserResult.algorithm,
            `Ed25519 algorithm mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.algorithm);
          expect(
            browserResult.signedHeaders,
            `Ed25519 signedHeaders mismatch: ${testCase.name}[${index}]`,
          ).toBe(serverResult.signedHeaders);
        }
      });
    }
  });

  test.describe("同値入力", () => {
    for (const testCase of canonicalRequestCases.filter(
      (value) => value.input.length > 1,
    )) {
      test(`HMAC は同じ署名値になる: ${testCase.name}`, async ({ page }) => {
        const signatures = await Promise.all(
          testCase.input.map((_, index) =>
            createBrowserHmacSignature(page, testCase.name, index),
          ),
        );
        const expectedSignature = signatures[0]?.signature;

        for (const [index, result] of signatures.entries()) {
          expect(
            result.signature,
            `HMAC equivalent signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignature);
        }
      });
    }

    for (const testCase of canonicalRequestCases.filter(
      (value) => value.input.length > 1,
    )) {
      test(`Ed25519 は同じ署名値になる: ${testCase.name}`, async ({ page }) => {
        const signatures = await Promise.all(
          testCase.input.map((_, index) =>
            createBrowserEd25519Signature(page, testCase.name, index),
          ),
        );
        const expectedSignature = signatures[0]?.signature;

        for (const [index, result] of signatures.entries()) {
          expect(
            result.signature,
            `Ed25519 equivalent signature mismatch: ${testCase.name}[${index}]`,
          ).toBe(expectedSignature);
        }
      });
    }
  });

  test.describe("ブラウザ署名をサーバで検証", () => {
    for (const testCase of canonicalRequestCases) {
      test(`HMAC: ${testCase.name}`, async ({ page }) => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const browserResult = await createBrowserHmacSignature(
            page,
            testCase.name,
            index,
          );

          await expect(
            verifyServerSignature({
              ...canonicalInput,
              algorithm: "HMAC-SHA256",
              secretKey: hmacDefaultKey,
              signature: browserResult.signature,
            }),
            `HMAC server verify failed: ${testCase.name}[${index}]`,
          ).resolves.toBe(true);
        }
      });
    }

    for (const testCase of canonicalRequestCases) {
      test(`Ed25519: ${testCase.name}`, async ({ page }) => {
        for (const [index, canonicalInput] of testCase.input.entries()) {
          const browserResult = await createBrowserEd25519Signature(
            page,
            testCase.name,
            index,
          );

          await expect(
            verifyServerSignature({
              ...canonicalInput,
              algorithm: "Ed25519",
              publicKey: ed25519DefaultPublicKey,
              signature: browserResult.signature,
            }),
            `Ed25519 server verify failed: ${testCase.name}[${index}]`,
          ).resolves.toBe(true);
        }
      });
    }
  });
});
