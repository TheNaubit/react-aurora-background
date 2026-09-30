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
