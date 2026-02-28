import { expect, test } from "@playwright/test";
import { createSignature as createServerSignature } from "../../lib/server/signature";
import { signatureCase } from "../shared/signature-case";

test.describe("browser signature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/browser/fixtures/index.html");
  });

  test("サーバと同じ入力で同じ署名を返す", async ({ page }) => {
    const input = {
      method: signatureCase.method,
      path: signatureCase.path,
      query: signatureCase.query,
      headers: signatureCase.headers,
      payload: signatureCase.payload,
      credentialTime: signatureCase.credentialTime,
      secretKey: signatureCase.secretKey,
    };

    const browserResult = await page.evaluate(async (value) => {
      return window.__browserSignature.create(value);
    }, input);

    const serverResult = await createServerSignature({
      method: signatureCase.method,
      path: signatureCase.path,
      query: new URLSearchParams(signatureCase.query),
      headers: signatureCase.headers,
      payload: signatureCase.payload,
      credentialTime: new Date(signatureCase.credentialTime),
      secretKey: signatureCase.secretKey,
    });

    expect(browserResult.signature).toBe(serverResult.signature);
    expect(browserResult.signedHeaders).toBe(serverResult.signedHeaders);
  });

  test("改ざん時にブラウザ検証が false になる", async ({ page }) => {
    const input = {
      method: signatureCase.method,
      path: signatureCase.path,
      query: signatureCase.query,
      headers: signatureCase.headers,
      payload: signatureCase.payload,
      credentialTime: signatureCase.credentialTime,
      secretKey: signatureCase.secretKey,
    };

    const result = await page.evaluate(async (value) => {
      const created = await window.__browserSignature.create(value);
      return window.__browserSignature.verify({
        ...value,
        payload: '{"message":"tampered"}',
        signature: created.signature,
      });
    }, input);

    expect(result).toBe(false);
  });
});
