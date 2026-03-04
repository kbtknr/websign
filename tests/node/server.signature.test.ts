import { describe, expect, it } from "vitest";
import { createSignature, verifySignature } from "../../lib/node/signature";
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

  it("credentialTime に文字列を渡しても署名の作成と検証が成功する", async () => {
    const base = signaturePatterns[0].input;
    const credentialTime = "20250101T000000Z";
    const result = await createSignature({
      ...base,
      credentialTime,
    });

    await expect(
      verifySignature({
        ...base,
        credentialTime,
        signature: result.signature,
      }),
    ).resolves.toBe(true);
  });

  it("credentialTime 文字列の書式が不正な場合は失敗する", async () => {
    const base = signaturePatterns[0].input;
    await expect(
      createSignature({
        ...base,
        credentialTime: "2025-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(
      "Invalid credentialTime format. Expected YYYYMMDDTHHmmssZ.",
    );
  });

  it("secretKey に Uint8Array / ArrayBuffer を渡しても署名の作成と検証が成功する", async () => {
    const base = signaturePatterns[0].input;
    const raw = new TextEncoder().encode("test-secret-key");
    const asArrayBuffer = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    );

    const resultByUint8Array = await createSignature({
      ...base,
      secretKey: raw,
    });
    const resultByArrayBuffer = await createSignature({
      ...base,
      secretKey: asArrayBuffer,
    });

    await expect(
      verifySignature({
        ...base,
        secretKey: raw,
        signature: resultByUint8Array.signature,
      }),
    ).resolves.toBe(true);
    await expect(
      verifySignature({
        ...base,
        secretKey: asArrayBuffer,
        signature: resultByArrayBuffer.signature,
      }),
    ).resolves.toBe(true);
    expect(resultByUint8Array.signature).toBe(resultByArrayBuffer.signature);
  });

  it("必須署名ヘッダーが signedHeaders にない場合は失敗する", async () => {
    const base = signaturePatterns[0].input;
    await expect(
      createSignature({
        ...base,
        signedHeaders: ["x-request-id"],
      }),
    ).rejects.toThrow("Missing required header values: content-type,host.");
  });

  it("必須署名ヘッダーの値が空の場合は失敗する", async () => {
    const base = signaturePatterns[0].input;
    await expect(
      createSignature({
        ...base,
        headers: {
          ...(base.headers as Record<string, string>),
          Host: "   ",
        },
      }),
    ).rejects.toThrow("Missing required header values: host.");
  });
});
