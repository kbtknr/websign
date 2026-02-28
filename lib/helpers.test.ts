import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  normalizeHeaders,
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
  });

  describe("normalizeHeaders", () => {
    it("ヘッダー名を小文字化してソートし、同名は行を分ける", () => {
      const normalized = normalizeHeaders({
        "X-B": " second ",
        "X-A": ["first", " third "],
      });

      expect(normalized).toBe("x-a:first\nx-a:third\nx-b:second");
    });

    it("Iterable入力でも配列値を展開する", () => {
      const normalized = normalizeHeaders([
        ["X-Test", ["a", "b"]],
        ["X-Test", "c"],
      ]);

      expect(normalized).toBe("x-test:a\nx-test:b\nx-test:c");
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
