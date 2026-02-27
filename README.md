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
- HTTPヘッダ（署名対象として選択したもの）
- リクエストボディ（またはそのハッシュ）
- 署名時刻（UTC）
- 共有鍵

### 正規化規則

- メソッドは大文字化して使用する。
- パスはRFC 3986に従って正規化し、不要な曖昧性を除去する。
- クエリはパラメータ名・値をURLエンコード後、キー昇順（同一キーは値昇順）で連結する。
- ヘッダ名は小文字化し、前後空白を除去して値を正規化する。
- 署名対象ヘッダ名は昇順で連結し、`SignedHeaders` として保持する。
- ボディは `SHA-256` でハッシュ化し、16進文字列で扱う。

### 生成手順

1. 正規化済みの `Method / Path / Query / Headers / SignedHeaders / PayloadHash` から Canonical Request を生成する。
2. `Algorithm / Timestamp / CanonicalRequestHash` を連結して String to Sign を生成する。
3. 共有鍵を用いて String to Sign に `HMAC-SHA256` を適用し、16進文字列の署名値を得る。

### 出力

- 署名値（`Signature`）
- 署名時刻（`Timestamp`）
- 署名対象ヘッダ一覧（`SignedHeaders`）
- アルゴリズム識別子（`HMAC-SHA256`）

これらの出力をHTTPヘッダへ付与して送信する。
