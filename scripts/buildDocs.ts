#!/usr/bin/env node

const cssModulesPlugin = require("esbuild-css-modules-plugin");

require("esbuild")
  .build({
    logLevel: "info",
    entryPoints: ["docs/docs.tsx"],
    bundle: true,
    tsconfig: "tsconfig-demo.json",
    outdir: "docs/react-aurora-background",
    plugins: [cssModulesPlugin()],
    sourcemap: true,
  })
  .catch(() => process.exit(1));
