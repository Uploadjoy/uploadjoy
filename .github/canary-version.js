import fs from "fs";
import { exec } from "child_process";

const pkgJsonPaths = [
  "packages/core/package.json",
  "packages/react/package.json",
  "packages/api-client/package.json",
  "packages/mime-types/package.json",
  "packages/shared/package.json",
];
try {
  exec("git rev-parse --short HEAD", (err, stdout) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    const commitHash = stdout.trim();

    for (const pkgJsonPath of pkgJsonPaths) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      const oldVersion = pkg.version;
      const [major, minor, patch] = oldVersion.split(".").map(Number);
      const newVersion = `${major}.${minor}.${patch + 1}-canary.${commitHash}`;

      pkg.version = newVersion;

      const content = JSON.stringify(pkg, null, "\t") + "\n";
      const newContent = content
        .replace(
          new RegExp(`"@uploadjoy/\\*": "${oldVersion}"`, "g"),
          `"@uploadjoy/*": "${newVersion}"`
        )

      fs.writeFileSync(pkgJsonPath, newContent);
    }
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}