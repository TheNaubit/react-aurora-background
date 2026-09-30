import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// https://vite.dev/guide/build.html#library-mode
export default defineConfig({
	build: {
		lib: {
			entry: resolve(import.meta.dirname, "src/index.ts"),
			fileName: "react-aurora-background",
			formats: ["es", "cjs"],
		},
		rolldownOptions: {
			// React and the dependencies are provided by the app
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"@nauverse/color-to-hsla",
			],
			output: {
				// The components use hooks and browser APIs: they are client components (Next.js App Router)
				banner: '"use client";',
			},
		},
		sourcemap: true,
		emptyOutDir: true,
	},
	test: {
		environment: "happy-dom",
		include: ["src/**/*.test.{ts,tsx}"],
		coverage: {
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/types.ts"],
			thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
		},
	},
});
