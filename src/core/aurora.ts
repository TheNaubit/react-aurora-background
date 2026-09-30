import { blobPositionsAt, createBlobPaths, type IBlobPath } from "./blobs.js";
import { blurToPixels } from "./blur.js";
import {
	createColorResolver,
	type IColorResolver,
	type RGBA,
} from "./color.js";
import type { IResolvedConfig } from "./config.js";
import {
	createCanvas,
	listenTo,
	reducedMotionQuery,
	stopListeningTo,
} from "./dom.js";
import { createAnimationLoop } from "./loop.js";
import { createRenderer, type IRenderer } from "./renderer.js";

// The canvas is rendered at this size (longest side) and scaled by the browser: the aurora is blurry, so a higher resolution would only cost GPU time
export const MAX_RENDER_SIZE = 256;

// While the aurora is still, colors that depend on the page (var(), currentColor, light-dark()...) are checked this often and redrawn when they change
const STILL_COLOR_CHECK_MS = 1000;

// A lost context that the browser does not restore within this time gets a new canvas (WebKit evicts idle contexts and never restores them)
const RESTORE_TIMEOUT_MS = 1000;
const MAX_NEW_CANVASES = 3;

export interface IAurora {
	update(config: IResolvedConfig): void;
	destroy(): void;
}

interface IAuroraOptions {
	/** Called when the WebGL rendering starts (true) or stops working (false, the CSS fallback stays visible). */
	onReadyChange: (ready: boolean) => void;
	/** Creates the resolver of the colors the parser does not know (oklch(), var()...). */
	createResolver?: (element: HTMLElement) => IColorResolver;
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

/**
 * Runs the aurora in a container: a canvas with WebGL rendering at a low resolution and a capped frame rate, and no rendering at all while it is off-screen, the page is hidden or the animation is paused.
 */
export function createAurora(
	container: HTMLElement,
	initialConfig: IResolvedConfig,
	{ onReadyChange, createResolver = createColorResolver }: IAuroraOptions,
): IAurora {
	let config = initialConfig;
	let canvas = createCanvas();
	let renderer: IRenderer | null = null;
	let paths: Array<IBlobPath> = [];
	let pathsKey = "";
	let seed: number | null = null;
	let isIntersecting = true;
	let size = { width: 0, height: 0 };
	let restoreTimeout: ReturnType<typeof setTimeout> | null = null;
	let colorCheckInterval: ReturnType<typeof setInterval> | null = null;
	let drawnColors = "";
	let newCanvases = 0;
	const motionQuery = reducedMotionQuery();
	const resolveColor = createResolver(container);

	// Colors the parser does not know (like oklch() or var(--brand)) parse as transparent: the browser resolves them
	const colorOf = (parsed: RGBA, source: string): RGBA => {
		const isUnknown =
			parsed.every((channel) => channel === 0) &&
			source.trim().toLowerCase() !== "transparent";
		return isUnknown ? resolveColor(source) : parsed;
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

	const currentColors = () => ({
		background: colorOf(config.bgColor, config.bgColorSource),
		colors: config.colors.map((color, index) =>
			colorOf(color, config.colorSources[index] ?? ""),
		),
	});

	const draw = (time: number) => {
		if (!renderer || size.width === 0 || size.height === 0) return;
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		const blur = blurToPixels(config.blurAmount, size, viewport);
		const { background, colors } = currentColors();
		drawnColors = JSON.stringify([background, colors]);
		renderer.render({
			background,
			colors,
			blobs: blobPositionsAt(paths, time, config.animDuration),
			softness: blur / Math.max(size.width, size.height),
		});
	};

	const hasPageColors = () =>
		[config.bgColorSource, ...config.colorSources].some((source, index) => {
			const parsed = index === 0 ? config.bgColor : config.colors[index - 1];
			return (
				parsed !== undefined &&
				parsed.every((channel) => channel === 0) &&
				source.trim().toLowerCase() !== "transparent"
			);
		});

	const stopColorCheck = () => {
		if (colorCheckInterval !== null) clearInterval(colorCheckInterval);
		colorCheckInterval = null;
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

	// A still aurora with page colors is drawn again when they change (a theme switch), without running the frame loop
	const checkColors = () => {
		if (JSON.stringify(Object.values(currentColors())) !== drawnColors) {
			draw(loop.time());
		}
	};

	const refresh = () => {
		loop.setFps(config.fps);
		stopColorCheck();
		if (shouldAnimate()) {
			loop.start();
			return;
		}
		loop.stop();
		// A still frame stays visible (and is updated when the props change)
		draw(loop.time());
		const isShown =
			renderer !== null &&
			isIntersecting &&
			document.visibilityState !== "hidden";
		if (isShown && hasPageColors()) {
			colorCheckInterval = setInterval(checkColors, STILL_COLOR_CHECK_MS);
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

	const setReady = (ready: boolean) => {
		canvas.style.opacity = ready ? "1" : "0";
		onReadyChange(ready);
	};

	const start = () => {
		renderer = createRenderer(canvas);
		if (!renderer) {
			setReady(false);
			return;
		}
		updatePaths();
		if (size.width > 0) resize(size.width, size.height);
		setReady(true);
		refresh();
	};

	const clearRestoreTimeout = () => {
		if (restoreTimeout !== null) clearTimeout(restoreTimeout);
		restoreTimeout = null;
	};

	const onContextRestored = () => {
		clearRestoreTimeout();
		start();
	};
	const onVisibilityChange = () => refresh();

	const resizeObserver =
		typeof ResizeObserver === "function"
			? new ResizeObserver(([entry]) => {
					if (entry) resize(entry.contentRect.width, entry.contentRect.height);
				})
			: null;
	const intersectionObserver =
		typeof IntersectionObserver === "function"
			? new IntersectionObserver(([entry]) => {
					isIntersecting = entry?.isIntersecting ?? true;
					refresh();
				})
			: null;

	const detachCanvas = () => {
		canvas.removeEventListener("webglcontextlost", onContextLost);
		canvas.removeEventListener("webglcontextrestored", onContextRestored);
		resizeObserver?.unobserve?.(canvas);
		intersectionObserver?.unobserve?.(canvas);
	};

	const attachCanvas = () => {
		canvas.addEventListener("webglcontextlost", onContextLost);
		canvas.addEventListener("webglcontextrestored", onContextRestored);
		resizeObserver?.observe(canvas);
		intersectionObserver?.observe(canvas);
	};

	// A context that is never restored needs a new canvas (and a new context)
	function replaceCanvas() {
		restoreTimeout = null;
		newCanvases += 1;
		detachCanvas();
		const next = createCanvas();
		canvas.replaceWith(next);
		canvas = next;
		attachCanvas();
		start();
	}

	function onContextLost(event: Event) {
		// Allows the browser to restore the context (mobile browsers drop it in the background)
		event.preventDefault();
		loop.stop();
		stopColorCheck();
		renderer = null;
		setReady(false);
		clearRestoreTimeout();
		if (newCanvases < MAX_NEW_CANVASES) {
			restoreTimeout = setTimeout(replaceCanvas, RESTORE_TIMEOUT_MS);
		}
	}

	container.append(canvas);
	attachCanvas();
	document.addEventListener("visibilitychange", onVisibilityChange);
	listenTo(motionQuery, refresh);

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
			clearRestoreTimeout();
			detachCanvas();
			document.removeEventListener("visibilitychange", onVisibilityChange);
			stopListeningTo(motionQuery, refresh);
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			stopColorCheck();
			resolveColor.dispose();
			renderer?.destroy();
			renderer = null;
			canvas.remove();
		},
	};
}
