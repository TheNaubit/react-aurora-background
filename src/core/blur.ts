const LENGTH_REGEX =
	/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|vw|vh|vmin|vmax|%|rem|em)?$/i;

// Used when the blur amount is not a valid length
const FALLBACK_BLUR_VW = 10;
const ROOT_FONT_SIZE = 16;

export interface ISize {
	width: number;
	height: number;
}

/**
 * Converts a blur amount (a number of pixels or a CSS length) to pixels.
 *
 * @param blur - The blur amount: a number (pixels) or "10vw", "80px", "20%" (of the element width), "5rem"...
 * @param element - The size of the element.
 * @param viewport - The size of the viewport.
 */
export function blurToPixels(
	blur: number | string,
	element: ISize,
	viewport: ISize,
): number {
	if (typeof blur === "number") {
		return Number.isFinite(blur) ? Math.max(0, blur) : 0;
	}

	const match = LENGTH_REGEX.exec(blur.trim());
	if (!match) return (viewport.width * FALLBACK_BLUR_VW) / 100;

	const value = Math.max(0, Number(match[1]));
	switch ((match[2] ?? "px").toLowerCase()) {
		case "vw":
			return (viewport.width * value) / 100;
		case "vh":
			return (viewport.height * value) / 100;
		case "vmin":
			return (Math.min(viewport.width, viewport.height) * value) / 100;
		case "vmax":
			return (Math.max(viewport.width, viewport.height) * value) / 100;
		case "%":
			return (element.width * value) / 100;
		case "rem":
		case "em":
			return value * ROOT_FONT_SIZE;
		default:
			return value;
	}
}
