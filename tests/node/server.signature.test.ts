import { describe, expect, it } from "vitest";
import { createSignature, verifySignature } from "../../lib/node/signature";
import {
  canonicalRequestCases,
  signatureTestCases,
  signingKeyCases,
} from "../shared/signature-case";

describe("server signature", () => {
  it("署名の作成と検証が成功する", async () => {
    for (const testCase of signatureTestCases) {
      const createInput = {
        ...testCase.canonicalInput,
        ...testCase.signingKey.createInput,
      };
      const result = await createSignature(createInput);
      await expect(
        verifySignature({
          ...testCase.canonicalInput,
          ...testCase.signingKey.verifyInput,
          signature: result.signature,
        }),
      ).resolves.toBe(true);
    }
  });

  it("入力改ざん時に検証が失敗する", async () => {
    const signatures = await Promise.all(
      signatureTestCases.map(async (testCase) => {
        const createInput = {
          ...testCase.canonicalInput,
          ...testCase.signingKey.createInput,
        };
        return {
          name: testCase.name,
          canonicalInput: testCase.canonicalInput,
          signingKey: testCase.signingKey,
          signature: (await createSignature(createInput)).signature,
        };
      }),
    );

    // 全パターンの署名を組み合わせて、改ざん検証が失敗することを確認する
    for (const expected of signatures) {
      for (const actual of signatures) {
        if (expected.name === actual.name) {
          continue;
        }

        await expect(
          verifySignature({
            ...actual.canonicalInput,
            ...actual.signingKey.verifyInput,
            signature: expected.signature,
          }),
        ).resolves.toBe(false);
      }
    }
  });

  it("入力パターンごとに異なる署名を返す", async () => {
    for (const signingKey of signingKeyCases) {
      const results = await Promise.all(
        signatureTestCases
          .filter((testCase) => testCase.signingKey.name === signingKey.name)
          .map(async (testCase) => {
            const createInput = {
              ...testCase.canonicalInput,
              ...testCase.signingKey.createInput,
            };
            const result = await createSignature(createInput);
            return { name: testCase.name, signature: result.signature };
          }),
      );

      const unique = new Set(results.map((item) => item.signature));
      expect(unique.size).toBe(results.length);
    }
  });

  it("クエリの入力パターンが異なっても同じ署名を返す", async () => {
    const base = canonicalRequestCases[0].input;
    const queryA = new URLSearchParams("locale=ja-JP&token=abc123");
    const queryB = new URLSearchParams("token=abc123&locale=ja-JP");

    for (const signingKey of signingKeyCases) {
      const resultA = await createSignature({
        ...base,
        query: queryA,
        ...signingKey.createInput,
      });
      const resultB = await createSignature({
        ...base,
        query: queryB,
        ...signingKey.createInput,
      });

      expect(resultA.signature).toBe(resultB.signature);
    }
  });

  it("headersとsignedHeadersの入力パターンが異なっていても同じ署名を返す", async () => {
    const base = canonicalRequestCases[0].input;
    const headersA = {
      Host: "api.example.com",
      "Content-Type": "application/json",
      "X-Request-Id": "req-0001",
      "X-WebSign-Nonce": "nonce-0001",
    };
    const headersB = {
      host: "  api.example.com  ",
      "content-type": " application/json ",
      "x-request-id": " req-0001 ",
      "x-websign-nonce": " nonce-0001 ",
    };
    const signedHeadersA = ["host", "content-type", "x-request-id"];
    const signedHeadersB = ["Host", "Content-Type", "X-Request-Id"];

    for (const signingKey of signingKeyCases) {
      const resultA = await createSignature({
        ...base,
        headers: headersA,
        signedHeaders: signedHeadersA,
        ...signingKey.createInput,
      });
      const resultB = await createSignature({
        ...base,
        headers: headersB,
        signedHeaders: signedHeadersB,
        ...signingKey.createInput,
      });

      expect(resultA.signature).toBe(resultB.signature);
    }
  });

  it("nonceHeader を指定すると signedHeaders に自動追加される", async () => {
    const base = canonicalRequestCases[0].input;

    for (const signingKey of signingKeyCases) {
      const result = await createSignature({
        ...base,
        nonceHeader: " X-WebSign-Nonce ",
        ...signingKey.createInput,
      });

      expect(result.signedHeaders).toBe(
        "content-type;host;x-request-id;x-websign-nonce",
      );

      await expect(
        verifySignature({
          ...base,
          nonceHeader: "x-websign-nonce",
          ...signingKey.verifyInput,
          signature: result.signature,
        }),
      ).resolves.toBe(true);
    }
  });

  it("credentialTime に文字列を渡しても署名の作成と検証が成功する", async () => {
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    const credentialTime = "20250101T000000Z";
    const createInput = { ...base, credentialTime, ...signingKey.createInput };
    const result = await createSignature(createInput);

    await expect(
      verifySignature({
        ...base,
        credentialTime,
        ...signingKey.verifyInput,
        signature: result.signature,
      }),
    ).resolves.toBe(true);
  });

  it("credentialTime 文字列の書式が不正な場合は失敗する", async () => {
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    await expect(
      createSignature({
        ...base,
        credentialTime: "2025-01-01T00:00:00.000Z",
        ...signingKey.createInput,
      }),
    ).rejects.toThrow(
      "Invalid credentialTime format. Expected YYYYMMDDTHHmmssZ.",
    );
  });

  it("secretKey に Uint8Array / ArrayBuffer を渡しても署名の作成と検証が成功する", async () => {
    const base = canonicalRequestCases[0].input;
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
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    await expect(
      createSignature({
        ...base,
        signedHeaders: ["x-request-id"],
        ...signingKey.createInput,
      }),
    ).rejects.toThrow("Missing required header values: content-type,host.");
  });

  it("必須署名ヘッダーの値が空の場合は失敗する", async () => {
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    await expect(
      createSignature({
        ...base,
        headers: {
          ...(base.headers as Record<string, string>),
          Host: "   ",
        },
        ...signingKey.createInput,
      }),
    ).rejects.toThrow("Missing required header values: host.");
  });

  it("nonceHeader を指定して対応ヘッダーがない場合は失敗する", async () => {
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    await expect(
      createSignature({
        ...base,
        headers: {
          Host: "api.example.com",
          "Content-Type": "application/json",
          "X-Request-Id": "req-0001",
        },
        nonceHeader: "x-websign-nonce",
        ...signingKey.createInput,
      }),
    ).rejects.toThrow("Missing required header values: x-websign-nonce.");
  });

  it("nonceHeader が空文字の場合は失敗する", async () => {
    const base = canonicalRequestCases[0].input;
    const signingKey = signingKeyCases[0];
    await expect(
      createSignature({
        ...base,
        nonceHeader: "   ",
        ...signingKey.createInput,
      }),
    ).rejects.toThrow("nonceHeader must not be empty.");
  });
});
