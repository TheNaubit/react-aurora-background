import { colorToHSLA } from "@nauverse/color-to-hsla";

/** A color as red, green, blue and alpha, each from 0 to 1. */
export type RGBA = readonly [number, number, number, number];

function hueToChannel(p: number, q: number, hue: number): number {
	const t = hue < 0 ? hue + 1 : hue > 1 ? hue - 1 : hue;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}

/**
 * Parses any CSS color (hex, rgb(), hsl(), named colors...) into red, green, blue and alpha from 0 to 1.
 * Invalid colors are transparent.
 */
export function parseColor(color: string): RGBA {
	const { h, s, l, a } = colorToHSLA(color);
	if (s === 0) return [l, l, l, a];

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const hue = h / 360;
	return [
		hueToChannel(p, q, hue + 1 / 3),
		hueToChannel(p, q, hue),
		hueToChannel(p, q, hue - 1 / 3),
		a,
	];
}

/**
 * Converts a parsed color to a CSS rgba() string.
 */
export function toCSS([r, g, b, a]: RGBA): string {
	const channel = (value: number) => Math.round(value * 255);
	return `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${Number(a.toFixed(3))})`;
}

const TRANSPARENT: RGBA = [0, 0, 0, 0];

/**
 * Converts a color computed by the browser (like "oklch(0.7 0.1 200)" or "rgb(1 2 3)") to channels, by drawing it on a 2D canvas.
 *
 * @returns The color, or null if there is no 2D canvas.
 */
export function rasterizeColor(computed: string): RGBA | null {
	try {
		const context = document
			.createElement("canvas")
			.getContext("2d", { willReadFrequently: true });
		if (!context) return null;
		context.fillStyle = computed;
		context.fillRect(0, 0, 1, 1);
		const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
		return [r / 255, g / 255, b / 255, a / 255];
	} catch {
		return null;
	}
}

export interface IColorResolver {
	(color: string): RGBA;
	dispose(): void;
}

/**
 * Resolves the colors only the browser understands (oklch(), color(), var(--x), currentColor, light-dark()...).
 * Each color gets a hidden probe element inside the aurora, so CSS variables and currentColor resolve like they would there. Its computed value is read on every call (cheap when nothing changed) and converted again only when it changes, so theme changes are followed.
 *
 * @param element - The element the colors are resolved in.
 * @param rasterize - Converts a computed color to channels.
 */
export function createColorResolver(
	element: HTMLElement,
	rasterize: (computed: string) => RGBA | null = rasterizeColor,
): IColorResolver {
	const probes = new Map<string, HTMLElement>();
	const cache = new Map<string, { computed: string; color: RGBA }>();

	const probeOf = (color: string): HTMLElement | null => {
		const existing = probes.get(color);
		if (existing) return existing;
		const probe = document.createElement("span");
		// background-color is not inherited: an undefined variable gives transparent, like in CSS
		probe.style.backgroundColor = color;
		if (probe.style.backgroundColor === "") return null;
		probe.style.display = "none";
		element.append(probe);
		probes.set(color, probe);
		return probe;
	};

	const resolve = (color: string): RGBA => {
		const probe = probeOf(color);
		if (!probe) return TRANSPARENT;
		const computed = getComputedStyle(probe).backgroundColor;
		const cached = cache.get(color);
		if (cached && cached.computed === computed) return cached.color;
		const resolved = rasterize(computed) ?? TRANSPARENT;
		cache.set(color, { computed, color: resolved });
		return resolved;
	};

	return Object.assign(resolve, {
		dispose() {
			for (const probe of probes.values()) probe.remove();
			probes.clear();
			cache.clear();
		},
	});
}
