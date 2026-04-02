import type {
  CanonicalRequestInput,
  JwkPrivateKey,
  JwkPublicKey,
} from "../../lib/types.ts";

export type SigningKey =
  | {
    algorithm: "HMAC-SHA256";
    secretKey: string;
  }
  | {
    algorithm: "Ed25519";
    privateKey: JwkPrivateKey;
    publicKey: JwkPublicKey;
  };

export type SignatureVector = {
  name: string;
  canonicalRequestInput: CanonicalRequestInput;
  signingKey: SigningKey;
  expected: {
    credentialTime: string;
    signedHeaders: string;
    signature: string;
  };
};

const hmacDefaultKey = "test-secret-key";

const ed25519DefaultPrivateKey: JwkPrivateKey = {
  crv: "Ed25519",
  d: "0d8Zgs_AaRI4pzw4ZhTIzd6Gfcc3DEe04VBAsUsdY1E",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

const ed25519DefaultPublicKey: JwkPublicKey = {
  crv: "Ed25519",
  x: "c5WZTTjsSgeiv1gDS1hTwdXD7qZHkZpjbYk2vEMhZxY",
  kty: "OKP",
};

function createBaseCanonicalRequestInput(): CanonicalRequestInput {
  return {
    method: "POST",
    path: "/v1/messages",
    query: new URLSearchParams("locale=ja-JP&token=abc123"),
    headers: {
      Host: "api.example.com",
      "Content-Type": "application/json",
      "X-Request-Id": "req-0001",
      "X-WebSign-Nonce": "nonce-0001",
    },
    signedHeaders: ["host", "content-type", "x-request-id"],
    requiredSignedHeaders: ["host", "content-type"],
    nonceHeader: "x-websign-nonce",
    payload: '{"message":"hello"}',
    credentialTime: "20250101T000000Z",
    serviceScope: "messaging/v1",
  };
}

function createHmacVector(
  name: string,
  canonicalRequestInput: CanonicalRequestInput,
  expected: SignatureVector["expected"],
): SignatureVector {
  return {
    name,
    canonicalRequestInput,
    signingKey: {
      algorithm: "HMAC-SHA256",
      secretKey: hmacDefaultKey,
    },
    expected,
  };
}

function createEd25519Vector(
  name: string,
  canonicalRequestInput: CanonicalRequestInput,
  expected: SignatureVector["expected"],
): SignatureVector {
  return {
    name,
    canonicalRequestInput,
    signingKey: {
      algorithm: "Ed25519",
      privateKey: ed25519DefaultPrivateKey,
      publicKey: ed25519DefaultPublicKey,
    },
    expected,
  };
}

function createVectorPair(
  name: string,
  canonicalRequestInput: CanonicalRequestInput,
  expected: {
    hmac: SignatureVector["expected"];
    ed25519: SignatureVector["expected"];
  },
): [SignatureVector, SignatureVector] {
  return [
    createHmacVector(`hmac-${name}`, canonicalRequestInput, expected.hmac),
    createEd25519Vector(
      `ed25519-${name}`,
      canonicalRequestInput,
      expected.ed25519,
    ),
  ];
}

export const signatureVectors: ReadonlyArray<SignatureVector> = [
  ...createVectorPair("base", createBaseCanonicalRequestInput(), {
    hmac: {
      credentialTime: "20250101T000000Z",
      signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
      signature:
        "4c299464a39056a1520683d96c0aa52c722c1271f71c9691ab6ed5212d7b3bec",
    },
    ed25519: {
      credentialTime: "20250101T000000Z",
      signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
      signature:
        "d9860fbb423f235445eb0667409a8383ca9c2f4758c05e291e609949b01b55885008dede26c4a7134da4c6da3bea751b469213bdcd299d2835ac5759b26ad706",
    },
  }),

  ...createVectorPair(
    "method-changed",
    {
      ...createBaseCanonicalRequestInput(),
      method: "PUT",
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d547b3e213e942786261343a8c7989ce45236b661d717288f46662c8fd8f3636",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "f1943d1f9694f6f8f4681c2c52d6c205d93e0104611a48aeb13da3306d96651936c894855006d945e4866e967ea14c91cd2e22aa8e1ac67fd4f26dadfefa8705",
      },
    },
  ),

  ...createVectorPair(
    "path-changed",
    {
      ...createBaseCanonicalRequestInput(),
      path: "/v1/messages/1",
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "38223631ec076dad079b5b82af520e394d15ddac277f48f37b5f246e78013a24",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "2dff2485e5f434cafbce072407dbf87208fe58bca098646ac9acd3c84212cc8d0c92d756b39b297db50df77d3b875fba418e2b7c95048f91be04c84f7fe70e0a",
      },
    },
  ),

  ...createVectorPair(
    "query-empty",
    {
      ...createBaseCanonicalRequestInput(),
      query: new URLSearchParams(),
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "a619b41ec02fae75de91602a731add9300f68213edd5b55035c7fc452fdecc9b",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "ef4197c0d7d059c83301a5ffa071a8ffceb32e623a08a3089aebdfd5b6f61ec3268525f19ffe9a52099e2499567eff359af4d14a1a31316303be5d85f61def0c",
      },
    },
  ),

  ...createVectorPair(
    "query-changed",
    {
      ...createBaseCanonicalRequestInput(),
      query: new URLSearchParams("locales=ja&token=abc123&locales=en"),
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "ad5b57880fa87ab2fca65686af4fbde99586470745a1b7829d3061329e010504",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "fa9e6937580c1fb97d4ed3abe93da7b6cfe1d5894352d3b711c5fffba95228093b1ce2fa842fd4009e0fdf6434dd3172d6f8df5d31791e338519a6c039885b0c",
      },
    },
  ),

  ...createVectorPair(
    "query-reordered",
    {
      ...createBaseCanonicalRequestInput(),
      query: new URLSearchParams("token=abc123&locale=ja-JP"),
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "4c299464a39056a1520683d96c0aa52c722c1271f71c9691ab6ed5212d7b3bec",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d9860fbb423f235445eb0667409a8383ca9c2f4758c05e291e609949b01b55885008dede26c4a7134da4c6da3bea751b469213bdcd299d2835ac5759b26ad706",
      },
    },
  ),

  ...createVectorPair(
    "header-changed",
    {
      ...createBaseCanonicalRequestInput(),
      headers: {
        Host: "api.example.com",
        "Content-Type": "application/json",
        "X-Request-Id": "req-0001",
        "X-WebSign-Nonce": "nonce-0001",
        Header1: "header-value1",
      },
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "4c299464a39056a1520683d96c0aa52c722c1271f71c9691ab6ed5212d7b3bec",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d9860fbb423f235445eb0667409a8383ca9c2f4758c05e291e609949b01b55885008dede26c4a7134da4c6da3bea751b469213bdcd299d2835ac5759b26ad706",
      },
    },
  ),

  ...createVectorPair(
    "header-value-changed",
    {
      ...createBaseCanonicalRequestInput(),
      headers: {
        Host: "api.example.com",
        "Content-Type": "application/json",
        "X-Request-Id": "req-0002",
        "X-WebSign-Nonce": "nonce-0002",
      },
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "413ab335630daa341f14d099ccc920a9e0a3032f1093a8d8865d7b1bc30c84f0",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "f01527b38137977afbec777ef78c691a805a6cec00cb2dcca964582ad1ba6f39709a26877f9101e6018b4fdee7299618a7a27975959ba61afd05ebd2b705c305",
      },
    },
  ),

  ...createVectorPair(
    "header-normalized",
    {
      ...createBaseCanonicalRequestInput(),
      headers: {
        host: "  api.example.com  ",
        "content-type": " application/json ",
        "x-request-id": " req-0001 ",
        "x-websign-nonce": " nonce-0001 ",
      },
      signedHeaders: ["Host", "Content-Type", "X-Request-Id"],
      nonceHeader: " X-WebSign-Nonce ",
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "4c299464a39056a1520683d96c0aa52c722c1271f71c9691ab6ed5212d7b3bec",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d9860fbb423f235445eb0667409a8383ca9c2f4758c05e291e609949b01b55885008dede26c4a7134da4c6da3bea751b469213bdcd299d2835ac5759b26ad706",
      },
    },
  ),

  ...createVectorPair(
    "nonce-header-changed",
    {
      ...createBaseCanonicalRequestInput(),
      headers: {
        Host: "api.example.com",
        "Content-Type": "application/json",
        "X-Request-Id": "req-0001",
        "X-WebSign-Nonce": "nonce-0001",
        Header1: "header-value1",
      },
      nonceHeader: "header1",
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;header1;host;x-request-id",
        signature:
          "bd2ccc07e082908b330d326df2cc031359747a95582fbdf559ed3d9b93b8761e",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;header1;host;x-request-id",
        signature:
          "27e610fb5104dc783ba2d908e607e61594e6a3beac688d86f3cb373e745071aed42bc4a4ed7a5771f50fe15415f3de5f8fd3c33532a86fbeee3d8dc176521f0e",
      },
    },
  ),

  ...createVectorPair(
    "signed-headers-changed",
    {
      ...createBaseCanonicalRequestInput(),
      headers: {
        Host: "api.example.com",
        "Content-Type": "application/json",
        "X-Req-Id": "req-0001",
        "X-WebSign-Nonce": "nonce-0001",
        Header1: "header-value1",
      },
      signedHeaders: ["host", "content-type", "x-req-id"],
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-req-id;x-websign-nonce",
        signature:
          "c13574095eff6907bb75af1bef05e12b707dd08fe307bb0db7157b96a5322313",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-req-id;x-websign-nonce",
        signature:
          "fca8c79afbe265e78cbb63e7928e21cbde4cabde6bfda43488a6685970c704cedeea117511e180febf988db5a8b6c68cb7180ae9c17e689ae2a6c8092818eb0b",
      },
    },
  ),

  ...createVectorPair(
    "required-headers-changed",
    {
      ...createBaseCanonicalRequestInput(),
      requiredSignedHeaders: [],
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "4c299464a39056a1520683d96c0aa52c722c1271f71c9691ab6ed5212d7b3bec",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d9860fbb423f235445eb0667409a8383ca9c2f4758c05e291e609949b01b55885008dede26c4a7134da4c6da3bea751b469213bdcd299d2835ac5759b26ad706",
      },
    },
  ),

  ...createVectorPair(
    "payload-changed",
    {
      ...createBaseCanonicalRequestInput(),
      payload: '{"message":"hello world"}',
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "4df7e1077a1eb1aa1b173b743ac160938448da1a8a979e29ac4cd9f4cbcb96d0",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "15745a5ad8be1ab2d9a59cd1e505a6ac24d6f191784d8405ba9209581455fde7232559a5c789608ff33a6ea6c56370587d90b2668180733f53b017e8ad2ae407",
      },
    },
  ),

  ...createVectorPair(
    "payload-null",
    {
      ...createBaseCanonicalRequestInput(),
      payload: null,
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "d82d2fe64894bdc93cdd40fa9a695ab5c3fe9a9928f814aff9abe3adf9ccc8a6",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "be8bec7773aedf60eb87d9086a363df030727451f7a60eef8d991010ecc30e24f7df1ee1757adc08091c80e46787d21a825bf9a39ab2209a036a28ddcd980800",
      },
    },
  ),

  ...createVectorPair(
    "credential-time-changed",
    {
      ...createBaseCanonicalRequestInput(),
      credentialTime: "20250101T000001Z",
    },
    {
      hmac: {
        credentialTime: "20250101T000001Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "cc3e301574f55b335fbc1be8c2cfaf2595d3f5db3ae69d11c4bb668494ac30d2",
      },
      ed25519: {
        credentialTime: "20250101T000001Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "bd089bb3b620d86a2aa62ccb1f0cb1ad1a609bafe837badea8acb6da247c16efbce638a699e65f538e5041ef5866ca83d46f159a141cd10e75742f8723ab660d",
      },
    },
  ),

  ...createVectorPair(
    "service-scope-changed",
    {
      ...createBaseCanonicalRequestInput(),
      serviceScope: "messaging/v2",
    },
    {
      hmac: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "69e14a0b27deec3590ced57ea2f65a21bd35d3a92216010a68ff31013dcc866f",
      },
      ed25519: {
        credentialTime: "20250101T000000Z",
        signedHeaders: "content-type;host;x-request-id;x-websign-nonce",
        signature:
          "a7014bd911eccf940e277e2debada44841834a6a1849c53dad2c192bab9dd21defdcea0ff29151a399a90015b07136ad87d15b9ec4373c2edc47e0c6610a8f0d",
      },
    },
  ),
];
