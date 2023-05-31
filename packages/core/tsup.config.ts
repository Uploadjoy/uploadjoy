import { defineConfig } from "tsup";

import { config } from "@uploadjoy/tsup-config";

export default defineConfig((opts) => ({
  ...config,
  entry: [
    "./client.ts",
    "./server.ts",
    "./next.ts",
    "./next-legacy.ts",
    "./validators.ts",
  ],
  clean: !opts.watch,
}));
