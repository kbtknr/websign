import type { HeaderRecord, NormalizeHeadersInput } from "./types";

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeHeaderValue(value: string): string {
  return value.trim();
}

export function normalizeQueryString(params: URLSearchParams): string {
  const pairs: Array<[string, string]> = [];

  for (const [key, value] of params.entries()) {
    pairs.push([encodeRfc3986(key), encodeRfc3986(value)]);
  }

  pairs.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return pairs.map(([key, value]) => `${key}=${value}`).join("&");
}

export function normalizeHeaders(
  headers: NormalizeHeadersInput,
  signedHeaders: ReadonlyArray<string>,
): { canonicalHeaders: string; canonicalSignedHeaders: string } {
  const signedHeaderSet = new Set(
    signedHeaders.map((name) => name.toLowerCase().trim()).filter(Boolean),
  );
  const pairs = new Map<string, string[]>();

  const append = (
    name: string,
    values: string | ReadonlyArray<string>,
  ): void => {
    const key = name.toLowerCase().trim();
    if (!key) {
      return;
    }
    if (signedHeaderSet && !signedHeaderSet.has(key)) {
      return;
    }

    const rawValues =
      typeof values === "string"
        ? [normalizeHeaderValue(values)]
        : values.map((v) => normalizeHeaderValue(v));
    if (rawValues.length === 0) {
      return;
    }

    const current = pairs.get(key);
    if (current) {
      current.push(...rawValues);
    } else {
      pairs.set(key, rawValues);
    }
  };

  if (headers instanceof Headers) {
    headers.forEach((value, name) => append(name, value));
  } else if (Symbol.iterator in Object(headers)) {
    for (const [name, value] of headers as Iterable<
      [string, string | ReadonlyArray<string>]
    >) {
      append(name, value);
    }
  } else {
    for (const [name, value] of Object.entries(headers as HeaderRecord)) {
      append(name, value);
    }
  }

  const sortedPairs = [...pairs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([name, values]) => values.map((value) => `${name}:${value}`));

  return {
    canonicalHeaders: sortedPairs.join("\n"),
    canonicalSignedHeaders: [...pairs.keys()]
      .sort((a, b) => a.localeCompare(b))
      .join(";"),
  };
}

export function formatDateTime(credentialTime: Date): string {
  const year = credentialTime.getUTCFullYear().toString().padStart(4, "0");
  const month = (credentialTime.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = credentialTime.getUTCDate().toString().padStart(2, "0");
  const hour = credentialTime.getUTCHours().toString().padStart(2, "0");
  const minute = credentialTime.getUTCMinutes().toString().padStart(2, "0");
  const second = credentialTime.getUTCSeconds().toString().padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

export function parseDateTime(credentialTime: string): Date {
  const match = credentialTime.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );

  if (!match) {
    throw new Error(
      "Invalid credentialTime format. Expected YYYYMMDDTHHmmssZ.",
    );
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw new Error("Invalid credentialTime value.");
  }

  return date;
}
