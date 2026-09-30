import { blobPositionsAt, createBlobPaths, type IBlobPath } from "./blobs.js";
import { blurToPixels } from "./blur.js";
import { type RGBA, resolveColorInBrowser } from "./color.js";
import type { IResolvedConfig } from "./config.js";
import { createAnimationLoop } from "./loop.js";
import { createRenderer, type IRenderer } from "./renderer.js";

// The canvas is rendered at this size (longest side) and scaled by the browser: the aurora is blurry, so a higher resolution would only cost GPU time
export const MAX_RENDER_SIZE = 256;

export interface IAurora {
	update(config: IResolvedConfig): void;
	destroy(): void;
}

interface IAuroraOptions {
	/** Called when the WebGL rendering starts (true) or stops working (false, the CSS fallback stays visible). */
	onReadyChange: (ready: boolean) => void;
	/** Resolves the colors the parser does not know (oklch(), var()...). */
	resolveColor?: (color: string, element: HTMLElement) => RGBA | null;
}

const TRANSPARENT: RGBA = [0, 0, 0, 0];

/**
 * The internal size of the canvas for an element size: at most MAX_RENDER_SIZE on the longest side.
 */
export function renderSize(width: number, height: number): [number, number] {
	const scale = Math.min(1, MAX_RENDER_SIZE / Math.max(width, height, 1));
	return [
		Math.max(1, Math.round(width * scale)),
		Math.max(1, Math.round(height * scale)),
	];
}

// Safari 13 and older only have addListener and removeListener on media queries
type LegacyMediaQueryList = MediaQueryList & {
	addListener?: (listener: () => void) => void;
	removeListener?: (listener: () => void) => void;
};

function listenTo(query: LegacyMediaQueryList | null, listener: () => void) {
	if (!query) return;
	if (typeof query.addEventListener === "function") {
		query.addEventListener("change", listener);
	} else {
		query.addListener?.(listener);
	}
}

function stopListeningTo(
	query: LegacyMediaQueryList | null,
	listener: () => void,
) {
	if (!query) return;
	if (typeof query.removeEventListener === "function") {
		query.removeEventListener("change", listener);
	} else {
		query.removeListener?.(listener);
	}
}

const reducedMotionQuery = () =>
	typeof matchMedia === "function"
		? matchMedia("(prefers-reduced-motion: reduce)")
		: null;

/**
 * Runs the aurora on a canvas: WebGL rendering at a low resolution, a capped frame rate, and no rendering at all while the canvas is off-screen, the page is hidden or the animation is paused.
 */
export function createAurora(
	canvas: HTMLCanvasElement,
	initialConfig: IResolvedConfig,
	{ onReadyChange, resolveColor = resolveColorInBrowser }: IAuroraOptions,
): IAurora {
	let config = initialConfig;
	let renderer: IRenderer | null = null;
	let paths: Array<IBlobPath> = [];
	let pathsKey = "";
	let seed: number | null = null;
	let isIntersecting = true;
	let size = { width: 0, height: 0 };
	const motionQuery = reducedMotionQuery();
	const resolvedColors = new Map<string, RGBA>();

	// Colors the parser does not know (like oklch() or var(--brand)) parse as transparent: the browser resolves them
	const colorOf = (parsed: RGBA, source: string): RGBA => {
		const isUnknown =
			parsed.every((channel) => channel === 0) &&
			source.trim().toLowerCase() !== "transparent";
		if (!isUnknown) return parsed;
		const cached = resolvedColors.get(source);
		if (cached) return cached;
		const resolved = resolveColor(source, canvas) ?? TRANSPARENT;
		resolvedColors.set(source, resolved);
		return resolved;
	};

	const updatePaths = () => {
		// A random seed is only created in the browser, so the server markup never differs from the first client render
		if (config.useRandomness && seed === null) {
			seed = Math.floor(Math.random() * 2 ** 31);
		}
		const key = `${config.numBubbles}:${config.useRandomness}`;
		if (key !== pathsKey) {
			paths = createBlobPaths(
				config.numBubbles,
				config.useRandomness ? seed : null,
			);
			pathsKey = key;
		}
	};

	const draw = (time: number) => {
		if (!renderer || size.width === 0 || size.height === 0) return;
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};
		const blur = blurToPixels(config.blurAmount, size, viewport);
		renderer.render({
			background: colorOf(config.bgColor, config.bgColorSource),
			colors: config.colors.map((color, index) =>
				colorOf(color, config.colorSources[index] ?? ""),
			),
			blobs: blobPositionsAt(paths, time, config.animDuration),
			softness: blur / Math.max(size.width, size.height),
		});
	};

	const loop = createAnimationLoop(config.fps, draw);

	const shouldAnimate = () =>
		renderer !== null &&
		size.width > 0 &&
		size.height > 0 &&
		!config.paused &&
		isIntersecting &&
		document.visibilityState !== "hidden" &&
		!(config.respectReducedMotion && motionQuery?.matches);

	const refresh = () => {
		loop.setFps(config.fps);
		if (shouldAnimate()) {
			loop.start();
		} else {
			loop.stop();
			// A still frame stays visible (and is updated when the props change)
			draw(loop.time());
		}
	};

	const resize = (width: number, height: number) => {
		size = { width, height };
		if (!renderer) return;
		renderer.resize(...renderSize(width, height));
		// Resizing clears the canvas: draw right away instead of waiting for the next frame
		draw(loop.time());
		refresh();
	};

	const start = () => {
		renderer = createRenderer(canvas);
		if (!renderer) {
			onReadyChange(false);
			return;
		}
		updatePaths();
		if (size.width > 0) resize(size.width, size.height);
		onReadyChange(true);
		refresh();
	};

	const onContextLost = (event: Event) => {
		// Allows the browser to restore the context (mobile browsers drop it in the background)
		event.preventDefault();
		loop.stop();
		renderer = null;
		onReadyChange(false);
	};
	const onContextRestored = () => start();
	const onVisibilityChange = () => refresh();

	const resizeObserver =
		typeof ResizeObserver === "function"
			? new ResizeObserver(([entry]) => {
					if (entry) {
						resize(entry.contentRect.width, entry.contentRect.height);
					}
				})
			: null;
	const intersectionObserver =
		typeof IntersectionObserver === "function"
			? new IntersectionObserver(([entry]) => {
					isIntersecting = entry?.isIntersecting ?? true;
					refresh();
				})
			: null;

	canvas.addEventListener("webglcontextlost", onContextLost);
	canvas.addEventListener("webglcontextrestored", onContextRestored);
	document.addEventListener("visibilitychange", onVisibilityChange);
	listenTo(motionQuery, refresh);
	resizeObserver?.observe(canvas);
	intersectionObserver?.observe(canvas);

	const rect = canvas.getBoundingClientRect();
	size = { width: rect.width, height: rect.height };
	start();

	return {
		update(nextConfig) {
			config = nextConfig;
			updatePaths();
			refresh();
		},
		destroy() {
			loop.stop();
			canvas.removeEventListener("webglcontextlost", onContextLost);
			canvas.removeEventListener("webglcontextrestored", onContextRestored);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			stopListeningTo(motionQuery, refresh);
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			renderer?.destroy();
			renderer = null;
		},
	};
}
