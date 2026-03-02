import type { HeaderRecord, NormalizeHeadersInput } from "./types";

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function compareByCodePoint(a: string, b: string): number {
  const aChars = [...a];
  const bChars = [...b];
  const len = Math.min(aChars.length, bChars.length);

  for (let i = 0; i < len; i += 1) {
    const aCodePoint = aChars[i].codePointAt(0) ?? 0;
    const bCodePoint = bChars[i].codePointAt(0) ?? 0;
    if (aCodePoint !== bCodePoint) {
      return aCodePoint - bCodePoint;
    }
  }

  return aChars.length - bChars.length;
}

export function normalizeHeaderName(headerName: string): string {
  return headerName.toLowerCase().trim();
}

function normalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeQueryString(params: URLSearchParams): string {
  const grouped = new Map<string, { encodedKey: string; values: string[] }>();

  for (const [key, value] of params.entries()) {
    const existing = grouped.get(key);
    const encodedValue = encodeRfc3986(value);
    if (existing) {
      existing.values.push(encodedValue);
      continue;
    }

    grouped.set(key, {
      encodedKey: encodeRfc3986(key),
      values: [encodedValue],
    });
  }

  const sortedKeys = [...grouped.keys()].sort(compareByCodePoint);

  return sortedKeys
    .flatMap((key) => {
      const entry = grouped.get(key);
      if (!entry) {
        return [];
      }
      return entry.values.map((value) => `${entry.encodedKey}=${value}`);
    })
    .join("&");
}

export function normalizeAndValidateHeaders(
  headers: NormalizeHeadersInput,
  signedHeaders: ReadonlyArray<string>,
  requiredSignedHeaders: ReadonlyArray<string>,
): {
  canonicalHeaders: string;
  canonicalSignedHeaders: string;
} {
  const signedHeaderSet = new Set(
    signedHeaders.map((name) => normalizeHeaderName(name)).filter(Boolean),
  );
  const requiredHeaderSet = new Set(
    requiredSignedHeaders
      .map((headerName) => normalizeHeaderName(headerName))
      .filter(Boolean),
  );

  const pairs = new Map<string, string[]>();

  const append = (
    name: string,
    values: string | ReadonlyArray<string>,
  ): void => {
    const key = normalizeHeaderName(name);
    if (!key) {
      return;
    }
    if (!signedHeaderSet.has(key)) {
      return;
    }

    const normalizedValues = (
      typeof values === "string"
        ? [normalizeHeaderValue(values)]
        : values.map((v) => normalizeHeaderValue(v))
    ).filter((value) => value.length > 0);
    if (normalizedValues.length === 0) {
      return;
    }

    const current = pairs.get(key);
    if (current) {
      current.push(...normalizedValues);
    } else {
      pairs.set(key, normalizedValues);
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
    .sort(([a], [b]) => compareByCodePoint(a, b))
    .flatMap(([name, values]) => values.map((value) => `${name}:${value}`));

  const canonicalSignedHeaders = [...pairs.keys()]
    .sort(compareByCodePoint)
    .join(";");

  const canonicalHeaderSet = new Set(pairs.keys());
  const missingCanonicalHeaders = [...requiredHeaderSet].filter(
    (headerName) => !canonicalHeaderSet.has(headerName),
  );
  if (missingCanonicalHeaders.length > 0) {
    throw new Error(
      `Missing required header values: ${missingCanonicalHeaders.join(",")}.`,
    );
  }

  return {
    canonicalHeaders: sortedPairs.join("\n"),
    canonicalSignedHeaders,
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
