import { defineConfig } from "tsup";

import { config } from "@uploadjoy/tsup-config";

export default defineConfig((opts) => ({
  ...config,
  entry: ["./hooks.ts"],
  clean: !opts.watch,
  esbuildOptions: (option) => {
    option.banner = {
      js: `"use client";`,
    };
  },
}));
