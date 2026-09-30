import { blobPositionsAt, createBlobPaths } from "./blobs.js";
import { type RGBA, toCSS } from "./color.js";
import type { IResolvedConfig } from "./config.js";

// The CSS functions that can make a color
const COLOR_FUNCTIONS = new Set([
	"rgb",
	"rgba",
	"hsl",
	"hsla",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
	"color",
	"color-mix",
	"light-dark",
	"var",
]);

// Keywords that are colors but that the parser does not know
const COLOR_KEYWORDS = new Set([
	"currentcolor",
	"accentcolor",
	"accentcolortext",
	"activetext",
	"buttonborder",
	"buttonface",
	"buttontext",
	"canvas",
	"canvastext",
	"field",
	"fieldtext",
	"graytext",
	"highlight",
	"highlighttext",
	"linktext",
	"mark",
	"marktext",
	"selecteditem",
	"selecteditemtext",
	"visitedtext",
]);

const ALLOWED_CHARACTERS_REGEX = /^[a-z0-9#%.,+\-/\s()]+$/i;
const FUNCTION_NAME_REGEX = /([a-z-]+)\s*\(/gi;

/**
 * Whether a string the parser does not know is a single CSS color that is safe to write in a style: only color functions and keywords, balanced parentheses, and no comma outside of them (which would add gradient layers or stops).
 */
export function isSafeColorSyntax(value: string): boolean {
	const color = value.trim();
	if (!ALLOWED_CHARACTERS_REGEX.test(color)) return false;
	if (!color.includes("(")) return COLOR_KEYWORDS.has(color.toLowerCase());

	const names = [...color.matchAll(FUNCTION_NAME_REGEX)].map((match) =>
		(match[1] as string).toLowerCase(),
	);
	if (!COLOR_FUNCTIONS.has(names[0] ?? "") || !color.endsWith(")")) {
		return false;
	}
	// Nested functions can be color functions or calc(), never url(), image() or others
	if (!names.every((name) => COLOR_FUNCTIONS.has(name) || name === "calc")) {
		return false;
	}

	let depth = 0;
	for (const [index, character] of [...color].entries()) {
		if (character === "(") depth += 1;
		if (character === ")") depth -= 1;
		if (depth < 0 || (depth === 0 && character === ",")) return false;
		// The first function must wrap the whole value
		if (depth === 0 && character === ")" && index < color.length - 1) {
			return false;
		}
	}
	return depth === 0;
}

/**
 * The CSS of a color: the parsed value when the parser knows it, the value as written when it is a safe color syntax (oklch(), var()...), or null.
 */
function cssColor(parsed: RGBA, source: string): string | null {
	const isParsed =
		parsed.some((channel) => channel !== 0) ||
		source.trim().toLowerCase() === "transparent";
	if (isParsed) return toCSS(parsed);
	return isSafeColorSyntax(source) ? source.trim() : null;
}

export interface IFallbackStyle {
	backgroundColor: string;
	backgroundImage: string;
}

/**
 * A still aurora made of CSS gradients, matching the first WebGL frame: it is rendered on the server (no flash before the shader starts) and it is the fallback when WebGL is not available.
 * Invalid colors are skipped, and the background color has its own property, so one wrong value never hides the rest.
 */
export function fallbackStyle(config: IResolvedConfig): IFallbackStyle {
	const positions = blobPositionsAt(
		createBlobPaths(config.numBubbles, null),
		0,
		config.animDuration,
	);
	const gradients = config.colors.flatMap((parsed, index) => {
		const color = cssColor(parsed, config.colorSources[index] ?? "");
		if (color === null) return [];
		const x = ((positions[index * 3] as number) * 100).toFixed(1);
		const y = ((positions[index * 3 + 1] as number) * 100).toFixed(1);
		return [
			`radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent 70%)`,
		];
	});

	return {
		backgroundColor:
			cssColor(config.bgColor, config.bgColorSource) ?? "transparent",
		// The last bubble is drawn on top (the first CSS gradient is the top layer)
		backgroundImage: gradients.reverse().join(", "),
	};
}
