import { expect, test } from "@playwright/test";
import {
  createSignature as createServerSignature,
  verifySignature as verifyServerSignature,
} from "../../lib/node/signature";
import { signatureTestCases } from "../shared/signature-case";

test.describe("browser signature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/browser/fixtures/index.html");
  });

  test("サーバと同じ入力で同じ署名を返す", async ({ page }) => {
    for (const testCase of signatureTestCases) {
      const browserResult = await page.evaluate(async (value) => {
        return window.__browserSignature.createByName(value);
      }, testCase.name);
      const serverResult = await createServerSignature({
        ...testCase.canonicalInput,
        ...testCase.signingKey.createInput,
      });

      expect(
        browserResult.signature,
        `signature mismatch: ${testCase.name}`,
      ).toBe(serverResult.signature);
      expect(
        browserResult.algorithm,
        `algorithm mismatch: ${testCase.name}`,
      ).toBe(serverResult.algorithm);
      expect(
        browserResult.signedHeaders,
        `signedHeaders mismatch: ${testCase.name}`,
      ).toBe(serverResult.signedHeaders);
    }
  });

  test("改ざん時にブラウザ検証が false になる", async ({ page }) => {
    const signatures = await Promise.all(
      signatureTestCases.map(async (testCase) => {
        const created = await page.evaluate(async (value) => {
          return window.__browserSignature.createByName(value);
        }, testCase.name);
        return { name: testCase.name, signature: created.signature };
      }),
    );

    // 全パターンの署名を組み合わせて、改ざん検証が失敗することを確認する
    for (const expected of signatures) {
      for (const actual of signatures) {
        if (expected.name === actual.name) {
          continue;
        }

        const result = await page.evaluate(
          async (value) => {
            return window.__browserSignature.verifyByName(
              value.patternName,
              value.signature,
            );
          },
          { patternName: actual.name, signature: expected.signature },
        );

        expect(
          result,
          `verify should fail: ${expected.name} -> ${actual.name}`,
        ).toBe(false);
      }
    }
  });

  test("ブラウザ署名をサーバで検証できる", async ({ page }) => {
    for (const testCase of signatureTestCases) {
      const browserResult = await page.evaluate(async (value) => {
        return window.__browserSignature.createByName(value);
      }, testCase.name);

      await expect(
        verifyServerSignature({
          ...testCase.canonicalInput,
          ...testCase.signingKey.verifyInput,
          signature: browserResult.signature,
        }),
        `server verify failed: ${testCase.name}`,
      ).resolves.toBe(true);
    }
  });
});
