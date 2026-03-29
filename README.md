# websign

Node.js、Bun、Deno、モダンブラウザで使える、Web API リクエスト署名ユーティリティです。  
`HMAC-SHA256` で署名の作成と検証を行います。

## 特徴

- Node.js / Bun / Deno / ブラウザ対応
- `createSignature` / `verifySignature` のシンプルな API
- 署名対象ヘッダの正規化と必須ヘッダ検証
- リクエスト改ざん検知と再送耐性に必要な時刻情報を扱える

## インストール

```bash
npm install websign
```

```bash
deno add npm:websign
```

## クイックスタート

`HMAC-SHA256` を使う場合の全入力パラメータを含む例です。

```ts
import { createSignature, verifySignature } from "websign";

const request = {
  algorithm: "HMAC-SHA256",
  method: "POST",
  path: "/v1/messages",
  query: new URLSearchParams({
    locale: "ja-JP",
    token: "abc123",
  }),
  headers: {
    host: "api.example.com",
    "content-type": "application/json",
    "x-client-id": "my-client",
    "x-websign-nonce": "nonce-0001",
  },
  signedHeaders: ["host", "content-type", "x-client-id"],
  requiredSignedHeaders: ["host", "content-type"],
  nonceHeader: "x-websign-nonce",
  payload: JSON.stringify({ message: "hello" }),
  credentialTime: "20250101T000000Z",
  serviceScope: "example/prod/v1",
  secretKey: "your-shared-secret",
};

const created = await createSignature(request);

const ok = await verifySignature({
  method: request.method,
  path: request.path,
  query: request.query,
  headers: request.headers,
  signedHeaders: request.signedHeaders,
  requiredSignedHeaders: request.requiredSignedHeaders,
  nonceHeader: request.nonceHeader,
  payload: request.payload,
  credentialTime: request.credentialTime,
  serviceScope: request.serviceScope,
  algorithm: request.algorithm,
  secretKey: request.secretKey,
  signature: created.signature,
});

console.log(created, ok);
```

## ランタイム別の入口

`package.json` の `exports` は次の方針です。

- `websign`: Node.js では Node 実装、Bun / Deno / ブラウザでは既定で `Web Crypto` 実装
- `websign/webcrypto`: `Web Crypto` 実装を明示したい場合の入口
- `websign/node`: Node.js 実装を明示したい場合の入口

このため、Node.js、Bun、Deno、ブラウザで使用できます。

### Node.js

```ts
import { createSignature, verifySignature } from "websign";
```

### Bun

既定エントリで `Web Crypto` 実装が選ばれます。

```ts
import { createSignature, verifySignature } from "websign";
```

明示的に `Web Crypto` 実装を使う場合も次で同じです。

```ts
import { createSignature, verifySignature } from "websign/webcrypto";
```

### Deno

既定エントリで `Web Crypto` 実装が選ばれます。

```ts
import { createSignature, verifySignature } from "npm:websign";
```

### ブラウザ

Vite など `browser` 条件を解決する bundler では、既定エントリで `Web Crypto` 実装が選ばれます。

```ts
import { createSignature, verifySignature } from "websign";
```

明示的に `Web Crypto` 実装を使う場合は次でも動きます。

```ts
import { createSignature, verifySignature } from "websign/webcrypto";
```

## API

### `createSignature(input)`

署名情報を生成します。

戻り値:

- `algorithm` (`"HMAC-SHA256"`)
- `credentialTime` (`YYYYMMDDTHHmmssZ`)
- `signedHeaders` (`;` 区切り)
- `signature` (16進小文字)

### `verifySignature(input)`

入力から再計算した署名と `input.signature` を照合し、`boolean` を返します。

## テスト

```bash
npm install
npx playwright install --with-deps chromium
npm run test:node
npm run test:browser
npm run test:deno
npm run test:bun
```

一括実行:

```bash
npm test
```

## ライセンス

MIT

## セキュリティ注意

- このライブラリは鍵管理を提供しません。秘密鍵は安全なストレージで管理してください。
- `credentialTime` の許容ずれ（例: ±5分）は呼び出し側で必ず検証してください。
- 本番では HTTPS を前提にし、署名対象ヘッダを固定して運用してください。
