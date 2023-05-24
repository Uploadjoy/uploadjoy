import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./hooks.ts"],
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["esm"],
});
