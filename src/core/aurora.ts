import { blobPositionsAt, createBlobPaths, type IBlobPath } from "./blobs.js";
import { blurToPixels } from "./blur.js";
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
}

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
	{ onReadyChange }: IAuroraOptions,
): IAurora {
	let config = initialConfig;
	let renderer: IRenderer | null = null;
	let paths: Array<IBlobPath> = [];
	let pathsKey = "";
	let seed: number | null = null;
	let isIntersecting = true;
	let size = { width: 0, height: 0 };
	const motionQuery = reducedMotionQuery();

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
			background: config.bgColor,
			colors: config.colors,
			blobs: blobPositionsAt(paths, time, config.animDuration),
			softness: blur / Math.max(size.width, size.height),
		});
	};

	const loop = createAnimationLoop(config.fps, draw);

	const shouldAnimate = () =>
		renderer !== null &&
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
		draw(loop.time());
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
	motionQuery?.addEventListener("change", refresh);
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
			motionQuery?.removeEventListener("change", refresh);
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			renderer?.destroy();
			renderer = null;
		},
	};
}
