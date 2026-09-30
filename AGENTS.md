# react-aurora-background - agent guide

This is a publishable React component: `@nauverse/react-aurora-background`.
`AuroraBackgroundProvider` wraps content with an animated aurora behind it; `AuroraBackground` is the aurora layer alone.

## Commands

Use **npm** only. Node.js `^22.14.0 || >=24.10.0` (`.nvmrc` has the recommended version).

```bash
npm install
npm run dev            # the demo (demo/) with hot reload
npm run lint           # Biome
npm run typecheck      # tsc --noEmit
npm run test:coverage  # Vitest (happy-dom) with coverage thresholds
npm run build          # vite build (ESM + CommonJS, "use client" banner) and tsc declarations -> dist/
npm run build:demo     # the demo site -> dist-demo/ (deployed to GitHub Pages by .github/workflows/pages.yml)
```

Run lint, typecheck, tests, build and build:demo before you say a task is done. CI runs the same steps on Node.js 22, 24 and 26.

## Layout

```
src/
  index.ts                  public exports (components and types)
  AuroraBackground.tsx      the aurora layer: the canvas and the CSS fallback
  AuroraBackgroundProvider.tsx  the wrapper: aurora behind the children
  types.ts                  public types (props)
  core/config.ts            defaults and prop validation
  core/color.ts             CSS color parsing (with @nauverse/color-to-hsla)
  core/blur.ts              blurAmount (px, vw, vh, %, rem...) to pixels
  core/blobs.ts             bubble layout and paths (deterministic, seeded randomness)
  core/shaders.ts           the GLSL ES 1.00 shaders (WebGL 1 and 2)
  core/renderer.ts          WebGL setup and drawing
  core/loop.ts              frame loop capped at `fps`, time only advances while running
  core/aurora.ts            wires everything: the canvas, resize, visibility, off-screen, reduced motion, context loss (and a new canvas when a context is never restored)
  core/dom.ts               the canvas element and media query helpers (with the Safari 13 addListener fallback)
  core/fallback.ts          the still CSS gradient version (server rendering and no WebGL); colors written as-is must pass isSafeColorSyntax
  test/fakes.ts             fake WebGL context, observers, matchMedia for the tests
demo/                       the demo site (Vite)
```

## Hard rules

1. **Performance first.** The canvas is rendered at most `MAX_RENDER_SIZE` (256) pixels on its longest side and scaled by the browser. Never animate with CSS filters, box shadows or layout properties. Nothing may run while the aurora is paused, off-screen or in a hidden page, except a once-per-second check of colors that depend on the page (var(), currentColor, light-dark(), only when the aurora is still and uses them).
2. **Always a fallback.** The server markup is the still CSS aurora (`fallbackBackground`), and it stays visible when WebGL is missing or the context is lost. The canvas fades in only when WebGL works.
3. **No hydration mismatch.** Rendering must be deterministic: randomness (the `useRandomness` seed) is only created in effects, never during render.
4. **Browser compatibility.** Shaders stay GLSL ES 1.00 so WebGL 1 works. No CSS modules or CSS files: styles are inline, so the package works with any bundler and in server components' client boundaries.
5. **Respect users.** `prefers-reduced-motion` shows a still frame by default (`respectReducedMotion`), and the layer is `aria-hidden` and ignores pointer events.
6. **Immutability and cleanup.** Do not mutate props. Every listener, observer and GL resource is released on unmount (React StrictMode mounts twice in development).
7. **No emojis** in code, comments or docs. No `console.log`.
8. **Files stay small** (under 400 lines typical, 800 max).

## Testing

- TDD. Write the failing test first. Every bug fix gets a regression test.
- Keep coverage at 90% or more. WebGL is faked in unit tests (`src/test/fakes.ts`): check real rendering in browsers too (Chromium, Firefox and WebKit, desktop and phone sizes), for example with Playwright against `npm run build:demo` served locally.
- Measure performance changes: renderer and GPU process CPU time (Chrome DevTools Protocol `SystemInfo.getProcessInfo`) before and after, visible and scrolled away.

## Releases

- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
- Do not add "Co-Authored-By" or similar lines to commit messages.
- `semantic-release` runs in `.github/workflows/release.yml` on pushes to `main`. It sets the version, updates `CHANGELOG.md`, tags, creates the GitHub release and publishes. Do not bump `version` by hand.
- Publishing uses npm trusted publishing (OIDC) for `TheNaubit/react-aurora-background`, `release.yml` and the `npm` environment. There is no `NPM_TOKEN` or personal access token. Do not add one. If you rename the workflow file or the environment, update the trusted publisher on npm.
- Every action in `.github/workflows` is pinned to a commit SHA with the version in a comment. Check workflows with `actionlint` and `zizmor`.

## Gotchas

- `conventional-commits-filter` is a pinned dev dependency on purpose: `@conventional-changelog/git-client` (from commitlint) has an optional peer dependency on version 6, and without it npm 11 may hoist version 5 (from semantic-release) and write a lock file that `npm ci` on npm 10 (Node.js 22) rejects. After changing dependencies, check that `npm ls --all` reports no invalid package.
- `@semantic-release/changelog` 7 and `@semantic-release/git` 11 need Node.js 24.15 or later. They are pinned to 6.0.3 and 10.0.1 (same features) so that contributors on older Node.js 24 releases can install.
- Versions up to 1.0.12 were released by hand (the tag `v1.0.12` was added so semantic-release continues from it).
- happy-dom has no layout: the tests trigger the fake ResizeObserver to give the canvas a size.
