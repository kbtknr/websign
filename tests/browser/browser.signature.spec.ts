import { expect, test } from "@playwright/test";
import {
  createSignature as createServerSignature,
  verifySignature as verifyServerSignature,
} from "../../lib/node/signature";
import { signaturePatterns } from "../shared/signature-case";

test.describe("browser signature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/browser/fixtures/index.html");
  });

  test("サーバと同じ入力で同じ署名を返す", async ({ page }) => {
    // 各パターンごとに署名を作成して検証する
    for (const { name, input } of signaturePatterns) {
      const browserResult = await page.evaluate(async (value) => {
        return window.__browserSignature.createByName(value);
      }, name);
      const serverResult = await createServerSignature(input);

      expect(browserResult.signature, `signature mismatch: ${name}`).toBe(
        serverResult.signature,
      );
      expect(browserResult.algorithm, `algorithm mismatch: ${name}`).toBe(
        serverResult.algorithm,
      );
      expect(
        browserResult.signedHeaders,
        `signedHeaders mismatch: ${name}`,
      ).toBe(serverResult.signedHeaders);
    }
  });

  test("改ざん時にブラウザ検証が false になる", async ({ page }) => {
    const signatures = await Promise.all(
      signaturePatterns.map(async ({ name }) => {
        const created = await page.evaluate(async (value) => {
          return window.__browserSignature.createByName(value);
        }, name);
        return { name, signature: created.signature };
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
    for (const { name, input } of signaturePatterns) {
      const browserResult = await page.evaluate(async (value) => {
        return window.__browserSignature.createByName(value);
      }, name);

      await expect(
        verifyServerSignature({
          ...input,
          signature: browserResult.signature,
        }),
        `server verify failed: ${name}`,
      ).resolves.toBe(true);
    }
  });
});
