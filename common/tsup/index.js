// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("child_process");

/** @type {import("tsup").Options} */
const config = {
  splitting: false,
  sourcemap: true,
  dts: true,
  format: ["esm"],
  ignoreWatch: [
    "**/.turbo",
    "**/dist",
    "**/node_modules",
    "**/.DS_STORE",
    "**/.git",
  ],
  async onSuccess() {
    // emit sourcemap to enable jump to definition
    execSync("pnpm tsc --project tsconfig.sourcemap.json");
  },
};

module.exports = { config };
