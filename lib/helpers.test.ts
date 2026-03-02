import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  normalizeAndValidateHeaders,
  normalizeQueryString,
  parseDateTime,
} from "./helpers";

describe("helpers", () => {
  describe("normalizeQueryString", () => {
    it("キーをRFC3986でエンコードしキー名でソートする", () => {
      const params = new URLSearchParams();
      params.append("z key", "value/1");
      params.append("a", "b c");
      params.append("a", "d");

      expect(normalizeQueryString(params)).toBe(
        "a=b%20c&a=d&z%20key=value%2F1",
      );
    });

    it("同一キーの value 順序を維持する", () => {
      const params = new URLSearchParams();
      params.append("a", "2");
      params.append("a", "1");

      expect(normalizeQueryString(params)).toBe("a=2&a=1");
    });

    it("キーはコードポイント順でソートする", () => {
      const params = new URLSearchParams();
      params.append("あ", "1");
      params.append("a", "2");
      params.append("ア", "3");

      expect(normalizeQueryString(params)).toBe("a=2&%E3%81%82=1&%E3%82%A2=3");
    });
  });

  describe("normalizeAndValidateHeaders", () => {
    it("ヘッダー名を小文字化してソートし、同名は行を分ける", () => {
      const normalized = normalizeAndValidateHeaders(
        {
          "X-B": " second ",
          "X-A": ["first", " third "],
        },
        ["x-a", "X-B"],
        [],
      );

      expect(normalized).toEqual({
        canonicalHeaders: "x-a:first\nx-a:third\nx-b:second",
        canonicalSignedHeaders: "x-a;x-b",
      });
    });

    it("Iterable入力でも配列値を展開する", () => {
      const normalized = normalizeAndValidateHeaders(
        [
          ["X-Test", ["a", "b"]],
          ["X-Test", "c"],
        ],
        ["x-test"],
        [],
      );

      expect(normalized).toEqual({
        canonicalHeaders: "x-test:a\nx-test:b\nx-test:c",
        canonicalSignedHeaders: "x-test",
      });
    });

    it("signedHeaders で署名対象ヘッダーを絞り込める", () => {
      const normalized = normalizeAndValidateHeaders(
        {
          "X-A": "a",
          "X-B": "b",
        },
        ["x-b"],
        [],
      );

      expect(normalized).toEqual({
        canonicalHeaders: "x-b:b",
        canonicalSignedHeaders: "x-b",
      });
    });

    it("値が空のヘッダーは無視する", () => {
      const normalized = normalizeAndValidateHeaders(
        {
          "X-A": "  ",
          "X-B": ["b", "   "],
          "X-C": "",
        },
        ["x-a", "x-b", "x-c"],
        [],
      );

      expect(normalized).toEqual({
        canonicalHeaders: "x-b:b",
        canonicalSignedHeaders: "x-b",
      });
    });

    it("ヘッダー値の連続空白は1つに正規化する", () => {
      const normalized = normalizeAndValidateHeaders(
        {
          "X-A": "  a \t\t b   c  ",
        },
        ["x-a"],
        [],
      );

      expect(normalized).toEqual({
        canonicalHeaders: "x-a:a b c",
        canonicalSignedHeaders: "x-a",
      });
    });

    it("必須署名ヘッダーが signedHeaders にない場合は失敗する", () => {
      expect(() =>
        normalizeAndValidateHeaders(
          {
            "X-Request-Id": "req-0001",
          },
          ["x-request-id"],
          ["host", "content-type"],
        ),
      ).toThrow("Missing required header values: host,content-type.");
    });

    it("必須署名ヘッダー値が空の場合は失敗する", () => {
      expect(() =>
        normalizeAndValidateHeaders(
          {
            Host: "   ",
            "Content-Type": "application/json",
          },
          ["host", "content-type"],
          ["host", "content-type"],
        ),
      ).toThrow("Missing required header values: host.");
    });
  });

  describe("formatDateTime / parseDateTime", () => {
    it("日時をフォーマットし、パースで元に戻せる", () => {
      const date = new Date(Date.UTC(2026, 1, 28, 12, 34, 56));
      const formatted = formatDateTime(date);

      expect(formatted).toBe("20260228T123456Z");
      expect(parseDateTime(formatted).toISOString()).toBe(date.toISOString());
    });

    it("不正な日時形式は例外になる", () => {
      expect(() => parseDateTime("2026-02-28T12:34:56Z")).toThrow(
        "Invalid credentialTime format. Expected YYYYMMDDTHHmmssZ.",
      );
    });

    it("存在しない日付は例外になる", () => {
      expect(() => parseDateTime("20260230T123456Z")).toThrow(
        "Invalid credentialTime value.",
      );
    });
  });
});
