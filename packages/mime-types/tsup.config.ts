import { defineConfig } from "tsup";

import { config } from "@uploadjoy/tsup-config";

export default defineConfig((opts) => ({
  ...config,
  entry: ["./index.ts", "./db.ts"],
  clean: !opts.watch,
  async onSuccess() {
    // void
  },
}));
