import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "node/index": "lib/node/index.ts",
    "webcrypto/index": "lib/webcrypto/index.ts",
    types: "lib/types.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist",
  clean: true,
  sourcemap: true,
  target: "es2022",
});
