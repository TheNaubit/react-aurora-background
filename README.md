<h1 align="center">
  React Aurora Background
  <br>
</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/TheNaubit/react-aurora-background/main/projectImage.jpg" alt="React Aurora Background" width="720" />
</p>

<h4 align="center">A lightweight, GPU-friendly aurora background for React.</h4>

<p align="center">
  <a href="https://github.com/TheNaubit/react-aurora-background/actions/workflows/ci.yml">
    <img src="https://github.com/TheNaubit/react-aurora-background/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status">
  </a>
  <a href="https://github.com/TheNaubit/react-aurora-background/actions/workflows/release.yml">
    <img src="https://github.com/TheNaubit/react-aurora-background/actions/workflows/release.yml/badge.svg?branch=main" alt="Release status">
  </a>
  <a href="https://www.npmjs.com/package/@nauverse/react-aurora-background">
    <img src="https://img.shields.io/npm/v/@nauverse/react-aurora-background.svg?style=flat" alt="npm version">
  </a>
  <a href="https://github.com/TheNaubit/react-aurora-background/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/@nauverse/react-aurora-background.svg?style=flat" alt="license">
  </a>
</p>

<p align="center">
  <a href="https://thenaubit.github.io/react-aurora-background/"><b>Live demo</b></a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#props">Props</a> •
  <a href="#performance">Performance</a> •
  <a href="#browser-support">Browser support</a> •
  <a href="#upgrading-from-1x">Upgrading from 1.x</a>
</p>

## Features

- One tiny WebGL shader instead of blurred DOM elements: smooth on phones, laptops stay quiet
- Rendered at a low resolution and scaled by the browser (an aurora is blurry anyway), at a capped frame rate
- Stops completely when it is off-screen, when the tab is hidden or when you pause it
- A still aurora for users who prefer reduced motion
- A CSS version rendered on the server: no flash before JavaScript runs, no hydration mismatch, and a fallback when WebGL is not available
- Works in Chrome, Edge, Firefox and Safari, on desktop and mobile (WebGL 2 or WebGL 1)
- Server rendering and Next.js App Router support (client component)
- React 18 and 19, ESM and CommonJS, TypeScript types included, no CSS files to import

## Installation

```bash
npm install @nauverse/react-aurora-background
```

## Usage

Wrap your content with the provider. It fills its parent (100% width and height), so give the parent a size:

```tsx
import { AuroraBackgroundProvider } from "@nauverse/react-aurora-background";

export function Hero() {
  return (
    <div style={{ height: "100vh" }}>
      <AuroraBackgroundProvider>
        <h1>Hello aurora</h1>
      </AuroraBackgroundProvider>
    </div>
  );
}
```

Or place the aurora layer alone inside any positioned element:

```tsx
import { AuroraBackground } from "@nauverse/react-aurora-background";

export function Card() {
  return (
    <div style={{ position: "relative", height: 300 }}>
      <AuroraBackground colors={["#ff6b6b", "#845ef7"]} numBubbles={3} />
      <p style={{ position: "relative" }}>Content on top</p>
    </div>
  );
}
```

### Next.js and server rendering

The components are client components (the package starts with `"use client"`), so you can use them directly in App Router pages and layouts. On the server they render the still CSS aurora, and the animated version fades in once the page is interactive.

## Props

Both components accept the same props (plus `children` for the provider):

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `colors` | `Color[]` | `["#FC466B", "#3f5efb", "#F8FF00", "#3AD59F"]` | The colors of the bubbles (hex, `rgb()`, `rgba()`, `hsl()`, `hsla()` or named colors). They repeat when there are more bubbles than colors. |
| `numBubbles` | `2` to `9` | `4` | The number of bubbles (color blobs). |
| `animDuration` | `number` | `20` | The duration of one animation cycle, in seconds. |
| `blurAmount` | `number \| string` | `"10vw"` | How soft the bubbles are: a number of pixels or a CSS length (`"80px"`, `"10vw"`, `"10vh"`, `"20%"` of the width, `"5rem"`). |
| `bgColor` | `Color` | `"#3f5efb"` | The color behind the bubbles. |
| `useRandomness` | `boolean` | `false` | Adds a small random variation to the size, the speed and the position of each bubble. |
| `fps` | `number` | `30` | The maximum frame rate (1 to 60). The aurora moves slowly, so 30 is smooth and uses half the energy of 60. |
| `paused` | `boolean` | `false` | Stops the animation. The current frame stays visible. |
| `respectReducedMotion` | `boolean` | `true` | Shows a still aurora when the user prefers reduced motion. |
| `className` | `string` | | Extra class names for the container. |
| `style` | `CSSProperties` | | Extra styles for the container. |

## Performance

Version 1 drew every bubble as a full-size element with a huge CSS `blur()` filter and animated its shape, so the browser recomputed large blurs on every frame. Version 2 draws the whole aurora with one small shader:

- **Low resolution**: at most 256 pixels on the longest side, scaled by the browser. The result looks the same because the aurora is blurry.
- **Capped frame rate**: 30 frames per second by default.
- **No work when you can not see it**: off-screen (IntersectionObserver), hidden tabs and `paused` stop the render loop.
- **Low-power GPU**: laptops with two GPUs keep using the integrated one.

Measured on the same full-screen page (Chromium, Apple M5, 10 seconds, CPU time of the page's renderer and of the GPU process):

| Version | Screen | Renderer | GPU process |
| ------- | ------ | -------- | ----------- |
| 1.0.12 | Desktop 1440x900 @2x | 4.6% | 20.0% |
| 2.0.0 | Desktop 1440x900 @2x | 2.7% | 3.4% |
| 1.0.12 | Phone 390x844 @3x | 5.3% | 15.0% |
| 2.0.0 | Phone 390x844 @3x | 3.2% | 3.9% |
| 2.0.0 | Scrolled off-screen | 0.0% | 0.3% |

## Browser support

The aurora uses WebGL 2, or WebGL 1 on older browsers, and was tested in Chromium, Firefox and WebKit (Safari), on desktop and phone screens. Without WebGL (or when a mobile browser drops the WebGL context in the background) the still CSS version stays visible, and the animation comes back when the context is restored.

## Upgrading from 1.x

The props are the same, so most apps only need to update the package. Things that change:

- The aurora is drawn by a WebGL shader: it looks very close, but not identical, to the CSS bubbles.
- `blurAmount` no longer sets a CSS `backdrop-filter`: it controls how soft the bubbles are (same units).
- React 18 or 19 is required, and the package no longer imports CSS module files (no bundler setup needed).
- The `className` of the provider is added to the container as a separate class (it was glued to an internal class name).
- Changing `colors`, `blurAmount` or `animDuration` after the first render now updates the aurora.
- New props: `fps`, `paused` and `respectReducedMotion` (reduced motion shows a still aurora by default).
- The `AuroraBackground` layer is exported, for custom layouts.
- Node.js 22 or later is required to install the package.

## Contributing

Contributions of any kind are welcome! Read the [contributing guide](./CONTRIBUTING.md) to get started (and [AGENTS.md](./AGENTS.md) if you use a coding agent). Found a bug? [Open an issue](https://github.com/TheNaubit/react-aurora-background/issues/new/choose).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
