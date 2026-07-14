import fs from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Resolves the "@/*" path alias (declared in tsconfig.json) to real files on
 * disk during tests. Unlike a plain `resolve.alias` string mapping, this only
 * claims specifiers that actually exist as a file — if the target doesn't
 * exist (e.g. a module intentionally not implemented yet, mocked via
 * `vi.mock`), it declines by returning null so Vitest's own mocking layer can
 * still intercept the import.
 */
function atAliasResolver(): Plugin {
  const root = path.resolve(__dirname);
  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  function resolveCandidate(base: string): string | null {
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    for (const ext of extensions) {
      const withExt = `${base}${ext}`;
      if (fs.existsSync(withExt)) return withExt;
    }
    for (const ext of extensions) {
      const withIndex = path.join(base, `index${ext}`);
      if (fs.existsSync(withIndex)) return withIndex;
    }
    return null;
  }

  return {
    name: "at-alias-resolver",
    resolveId(id) {
      if (!id.startsWith("@/")) return null;
      const base = path.join(root, id.slice(2));
      return resolveCandidate(base);
    },
  };
}

export default defineConfig({
  plugins: [atAliasResolver()],
});
