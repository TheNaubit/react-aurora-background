import { resolve } from "node:path";
import { defineConfig } from "vite";

// The demo site (GitHub Pages)
export default defineConfig({
	root: resolve(import.meta.dirname, "demo"),
	base: "./",
	build: {
		outDir: resolve(import.meta.dirname, "dist-demo"),
		emptyOutDir: true,
	},
});
