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

/**
 * Resolves any color the browser understands (oklch(), color(), var(--x), currentColor...) by letting the browser compute and draw it.
 *
 * @param color - The CSS color.
 * @param element - An element in the document, used to resolve CSS variables and currentColor.
 * @returns The color, or null if the browser does not understand it.
 */
export function resolveColorInBrowser(
	color: string,
	element: HTMLElement,
): RGBA | null {
	try {
		const probe = document.createElement("span");
		probe.style.color = color;
		if (probe.style.color === "") return null;
		(element.parentElement ?? document.body).append(probe);
		const computed = getComputedStyle(probe).color;
		probe.remove();

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
