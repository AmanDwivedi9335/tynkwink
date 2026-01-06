import esbuild from "esbuild";
import { mkdirSync, cpSync } from "node:fs";

const watch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

// Copy popup.html into dist
cpSync("src/popup/popup.html", "dist/popup.html", { force: true });

const common = {
  bundle: true,
  sourcemap: true,
  target: ["es2022"],
  platform: "browser"
};

const buildAll = async () => {
  await esbuild.build({
    ...common,
    entryPoints: ["src/background.ts"],
    outfile: "dist/background.js",
    format: "esm"
  });

  await esbuild.build({
    ...common,
    entryPoints: ["src/content.ts"],
    outfile: "dist/content.js",
    format: "esm"
  });

  await esbuild.build({
    ...common,
    entryPoints: ["src/popup/popup.ts"],
    outfile: "dist/popup.js",
    format: "esm"
  });
};

if (watch) {
  const ctx = await esbuild.context({
    ...common,
    entryPoints: ["src/background.ts", "src/content.ts", "src/popup/popup.ts"],
    outdir: "dist",
    format: "esm"
  });
  await ctx.watch();
  console.log("Watching...");
} else {
  await buildAll();
  console.log("Build complete.");
}
