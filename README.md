# web-signature

WebAPIリクエストの認証・メッセージの安全性・繰り返しの耐性を担うモジュールを実装します。
署名作成と検証をNode.jsとモダンブラウザで動作します。

鍵の管理は含みません。
鍵(JWK)を指定して署名の作成と検証をします。

## 対応するアルゴリズム

- `HMAC-SHA256`
  - 共有鍵を使った署名方式です。
  - ハッシュ関数には `SHA-256` を使用します。

## 仕組み

ざっくり言うと、[AWS Signature Version 4](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)を参考にしています。

## 署名作成

### 入力

- HTTPメソッド（例: `GET`, `POST`）
- リクエストパス
- クエリパラメータ（キーと値）
- HTTPヘッダ
- 署名対象ヘッダ名（`signedHeaders`）
- リクエストボディ（`string | ArrayBuffer | Uint8Array | null`）
- 署名時刻（`string | Date`）
- サービススコープ（`serviceScope`。`/` 区切り文字列）
- 共有鍵

### 正規化規則

- メソッドは大文字化して使用する。
- パスは入力値をそのまま使用する（追加の正規化はしない）。
- クエリはキーと値を RFC3986 形式でURLエンコードし、キー名で昇順ソートして `key=value` を `&` 連結する。
- ヘッダは `signedHeaders` に含まれる名前のみ対象にする。
- ヘッダ名は小文字化して前後空白を除去する。ヘッダ値も前後空白を除去し、空文字になった値は除外する。
- `canonicalHeaders` は `name:value` をヘッダ名昇順で改行連結する。
- `canonicalSignedHeaders` は実際に `canonicalHeaders` に含まれたヘッダ名（重複なし）を昇順で `;` 連結する。
- `credentialTime` は `YYYYMMDDTHHmmssZ` を期待する。`Date` の場合はこの形式に変換し、`string` の場合はこの形式に準拠している前提でそのまま使用する。
- ペイロードハッシュは `payload ?? ""` を `SHA-256` して16進文字列で扱う。

### 生成手順

1. 以下を `\n` で連結して `canonicalRequest` を作る。
   `METHOD_UPPER / path / normalizedQuery / canonicalHeaders / "" / canonicalSignedHeaders / payloadHash`
2. `canonicalRequestHash = SHA256_HEX(canonicalRequest)` を計算する。
3. 以下を `\n` で連結して `stringToSign` を作る。
   `HMAC-SHA256 / credentialTime / serviceScope / canonicalRequestHash`
4. 署名鍵を次の手順で導出する。
   - 初期鍵: UTF-8 バイト列 `WebSignature${secretKey}`
   - 反復入力: `[credentialTime, ...serviceScope.split("/").reverse(), "websignature_request"]`
   - 各要素 `part` ごとに `signingKey = HMAC_SHA256(signingKey, UTF-8(part))` で更新する。
5. `signatureBytes = HMAC_SHA256(signingKey, UTF-8(stringToSign))` を計算する。
6. `signatureBytes` を lower-case の16進文字列に変換して `signature` とする。

### 出力

- 署名値（`Signature`）
- 署名時刻（`credentialTime`）
- 署名対象ヘッダ一覧（`SignedHeaders`）
- アルゴリズム識別子（`HMAC-SHA256`）

これらの出力をHTTPヘッダへ付与して送信する。
