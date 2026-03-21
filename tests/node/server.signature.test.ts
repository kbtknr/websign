import { describe, expect, it } from "vitest";
import { createSignature, verifySignature } from "../../lib/node/signature";
import {
  algorithmKeyPatterns,
  canonicalBuildPatterns,
} from "../shared/signature-case";

describe("server signature", () => {
  it("署名の作成と検証が成功する", async () => {
    for (const { input } of canonicalBuildPatterns) {
      for (const signer of algorithmKeyPatterns) {
        const createInput = { ...input, ...signer.createInput };
        const result = await createSignature(createInput);
        await expect(
          verifySignature({
            ...input,
            ...signer.verifyInput,
            signature: result.signature,
          }),
        ).resolves.toBe(true);
      }
    }
  });

  it("入力改ざん時に検証が失敗する", async () => {
    const signatures = await Promise.all(
      canonicalBuildPatterns.flatMap(({ name, input }) =>
        algorithmKeyPatterns.map(async (signer) => {
          const createInput = { ...input, ...signer.createInput };
          return {
            name: `${name}__${signer.name}`,
            canonical: input,
            signer,
            signature: (await createSignature(createInput)).signature,
          };
        }),
      ),
    );

    // 全パターンの署名を組み合わせて、改ざん検証が失敗することを確認する
    for (const expected of signatures) {
      for (const actual of signatures) {
        if (expected.name === actual.name) {
          continue;
        }

        await expect(
          verifySignature({
            ...actual.canonical,
            ...actual.signer.verifyInput,
            signature: expected.signature,
          }),
        ).resolves.toBe(false);
      }
    }
  });

  it("入力パターンごとに異なる署名を返す", async () => {
    for (const signer of algorithmKeyPatterns) {
      const results = await Promise.all(
        canonicalBuildPatterns.map(async ({ name, input }) => {
          const createInput = { ...input, ...signer.createInput };
          const result = await createSignature(createInput);
          return { name, signature: result.signature };
        }),
      );

      const unique = new Set(results.map((item) => item.signature));
      expect(unique.size).toBe(results.length);
    }
  });

  it("credentialTime に文字列を渡しても署名の作成と検証が成功する", async () => {
    const base = canonicalBuildPatterns[0].input;
    const signer = algorithmKeyPatterns[0];
    const credentialTime = "20250101T000000Z";
    const createInput = { ...base, credentialTime, ...signer.createInput };
    const result = await createSignature(createInput);

    await expect(
      verifySignature({
        ...base,
        credentialTime,
        ...signer.verifyInput,
        signature: result.signature,
      }),
    ).resolves.toBe(true);
  });

  it("credentialTime 文字列の書式が不正な場合は失敗する", async () => {
    const base = canonicalBuildPatterns[0].input;
    const signer = algorithmKeyPatterns[0];
    await expect(
      createSignature({
        ...base,
        credentialTime: "2025-01-01T00:00:00.000Z",
        ...signer.createInput,
      }),
    ).rejects.toThrow(
      "Invalid credentialTime format. Expected YYYYMMDDTHHmmssZ.",
    );
  });

  it("secretKey に Uint8Array / ArrayBuffer を渡しても署名の作成と検証が成功する", async () => {
    const base = canonicalBuildPatterns[0].input;
    const raw = new TextEncoder().encode("test-secret-key");
    const asArrayBuffer = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    );

    const resultByUint8Array = await createSignature({
      ...base,
      algorithm: "HMAC-SHA256",
      secretKey: raw,
    });
    const resultByArrayBuffer = await createSignature({
      ...base,
      algorithm: "HMAC-SHA256",
      secretKey: asArrayBuffer,
    });

    await expect(
      verifySignature({
        ...base,
        algorithm: "HMAC-SHA256",
        secretKey: raw,
        signature: resultByUint8Array.signature,
      }),
    ).resolves.toBe(true);
    await expect(
      verifySignature({
        ...base,
        algorithm: "HMAC-SHA256",
        secretKey: asArrayBuffer,
        signature: resultByArrayBuffer.signature,
      }),
    ).resolves.toBe(true);
    expect(resultByUint8Array.signature).toBe(resultByArrayBuffer.signature);
  });

  it("必須署名ヘッダーが signedHeaders にない場合は失敗する", async () => {
    const base = canonicalBuildPatterns[0].input;
    const signer = algorithmKeyPatterns[0];
    await expect(
      createSignature({
        ...base,
        signedHeaders: ["x-request-id"],
        ...signer.createInput,
      }),
    ).rejects.toThrow("Missing required header values: content-type,host.");
  });

  it("必須署名ヘッダーの値が空の場合は失敗する", async () => {
    const base = canonicalBuildPatterns[0].input;
    const signer = algorithmKeyPatterns[0];
    await expect(
      createSignature({
        ...base,
        headers: {
          ...(base.headers as Record<string, string>),
          Host: "   ",
        },
        ...signer.createInput,
      }),
    ).rejects.toThrow("Missing required header values: host.");
  });
});
