# websign

Node.js とモダンブラウザで使える、Web API リクエスト署名ユーティリティです。  
`HMAC-SHA256` で署名の作成と検証を行います。

## 特徴

- Node.js / ブラウザ両対応（`exports` 条件分岐）
- `createSignature` / `verifySignature` のシンプルな API
- 署名対象ヘッダの正規化と必須ヘッダ検証（`host`, `content-type`）
- リクエスト改ざん検知と再送耐性に必要な時刻情報を扱える

## インストール

```bash
npm install websign
```

## クイックスタート

```ts
import { createSignature, verifySignature } from "websign";

const request = {
  method: "POST",
  path: "/v1/messages",
  query: new URLSearchParams({ q: "hello" }),
  headers: {
    host: "api.example.com",
    "content-type": "application/json",
    "x-client-id": "my-client",
  },
  signedHeaders: ["host", "content-type", "x-client-id"],
  payload: JSON.stringify({ message: "hello" }),
  credentialTime: new Date(),
  serviceScope: "example/prod/v1",
  secretKey: "your-shared-secret",
};

const signatureResult = await createSignature(request);

const ok = await verifySignature({
  ...request,
  signature: signatureResult.signature,
});

console.log(signatureResult, ok);
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
