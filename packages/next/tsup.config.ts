import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./client.ts", "./server.ts"],
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["esm"],
});
