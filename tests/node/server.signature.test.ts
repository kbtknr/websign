import { describe, expect, it } from "vitest";
import { createSignature, verifySignature } from "../../lib/server/signature";
import { signatureCase } from "../shared/signature-case";

function buildInput() {
  return {
    method: signatureCase.method,
    path: signatureCase.path,
    query: new URLSearchParams(signatureCase.query),
    headers: signatureCase.headers,
    payload: signatureCase.payload,
    credentialTime: new Date(signatureCase.credentialTime),
    secretKey: signatureCase.secretKey,
  };
}

describe("server signature", () => {
  it("署名の作成と検証が成功する", async () => {
    const input = buildInput();
    const result = await createSignature(input);

    await expect(
      verifySignature({
        ...input,
        signature: result.signature,
      }),
    ).resolves.toBe(true);
  });

  it("入力改ざん時に検証が失敗する", async () => {
    const input = buildInput();
    const result = await createSignature(input);

    await expect(
      verifySignature({
        ...input,
        payload: '{"message":"tampered"}',
        signature: result.signature,
      }),
    ).resolves.toBe(false);
  });
});
