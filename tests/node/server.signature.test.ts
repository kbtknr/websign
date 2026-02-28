import { describe, expect, it } from "vitest";
import { createSignature, verifySignature } from "../../lib/server/signature";
import { signaturePatterns } from "../shared/signature-case";

describe("server signature", () => {
  it("署名の作成と検証が成功する", async () => {
    // 各パターンごとに署名を作成して検証する
    for (const { input } of signaturePatterns) {
      const result = await createSignature(input);
      await expect(
        verifySignature({
          ...input,
          signature: result.signature,
        }),
      ).resolves.toBe(true);
    }
  });

  it("入力改ざん時に検証が失敗する", async () => {
    const signatures = await Promise.all(
      signaturePatterns.map(async ({ name, input }) => ({
        name,
        input,
        signature: (await createSignature(input)).signature,
      })),
    );

    // 全パターンの署名を組み合わせて、改ざん検証が失敗することを確認する
    for (const expected of signatures) {
      for (const actual of signatures) {
        if (expected.name === actual.name) {
          continue;
        }

        await expect(
          verifySignature({
            ...actual.input,
            signature: expected.signature,
          }),
        ).resolves.toBe(false);
      }
    }
  });

  it("入力パターンごとに異なる署名を返す", async () => {
    const results = await Promise.all(
      signaturePatterns.map(async ({ name, input }) => {
        const result = await createSignature(input);
        return { name, signature: result.signature };
      }),
    );

    const unique = new Set(results.map((item) => item.signature));
    expect(unique.size).toBe(results.length);
  });
});
