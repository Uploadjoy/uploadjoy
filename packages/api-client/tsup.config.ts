import { defineConfig } from "tsup";

export default defineConfig((opts) => ({
  entry: ["./src/index.ts"],
  splitting: false,
  sourcemap: true,
  clean: !opts.watch,
  dts: true,
  format: ["esm"],
  ignoreWatch: [
    "**/.turbo",
    "**/dist",
    "**/node_modules",
    "**/.DS_STORE",
    "**/.git",
  ],
}));
