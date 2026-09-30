import type { AuroraBackgroundConfig, Color } from "../types.js";
import { parseColor, type RGBA } from "./color.js";

export const DEFAULT_COLORS: ReadonlyArray<Color> = [
	"#FC466B",
	"#3f5efb",
	"#F8FF00",
	"#3AD59F",
];
export const DEFAULT_BG_COLOR: Color = "#3f5efb";
export const DEFAULT_NUM_BUBBLES = 4;
export const DEFAULT_ANIM_DURATION = 20;
export const DEFAULT_BLUR_AMOUNT = "10vw";
export const DEFAULT_FPS = 30;

export const MIN_BUBBLES = 2;
export const MAX_BUBBLES = 9;
const MAX_FPS = 60;

/** The configuration used by the renderer, with every value validated. */
export interface IResolvedConfig {
	colors: ReadonlyArray<RGBA>;
	bgColor: RGBA;
	// The colors as written, for CSS (the server fallback) and for colors the parser does not know (oklch(), var()...)
	colorSources: ReadonlyArray<string>;
	bgColorSource: string;
	numBubbles: number;
	animDuration: number;
	blurAmount: number | string;
	useRandomness: boolean;
	fps: number;
	paused: boolean;
	respectReducedMotion: boolean;
}

function finiteOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Validates the props and fills the defaults. The bubble colors repeat when there are more bubbles than colors.
 */
export function resolveConfig(config: AuroraBackgroundConfig): IResolvedConfig {
	const numBubbles = Math.min(
		MAX_BUBBLES,
		Math.max(
			MIN_BUBBLES,
			Math.round(finiteOr(config.numBubbles, DEFAULT_NUM_BUBBLES)),
		),
	);
	const palette =
		config.colors && config.colors.length > 0 ? config.colors : DEFAULT_COLORS;
	const animDuration = finiteOr(config.animDuration, DEFAULT_ANIM_DURATION);

	const colorSources = Array.from(
		{ length: numBubbles },
		(_, index) => palette[index % palette.length] as string,
	);
	const bgColorSource = config.bgColor ?? DEFAULT_BG_COLOR;

	return {
		colors: colorSources.map(parseColor),
		bgColor: parseColor(bgColorSource),
		colorSources,
		bgColorSource,
		numBubbles,
		animDuration: animDuration > 0 ? animDuration : DEFAULT_ANIM_DURATION,
		blurAmount: config.blurAmount ?? DEFAULT_BLUR_AMOUNT,
		useRandomness: config.useRandomness ?? false,
		fps: Math.min(MAX_FPS, Math.max(1, finiteOr(config.fps, DEFAULT_FPS))),
		paused: config.paused ?? false,
		respectReducedMotion: config.respectReducedMotion ?? true,
	};
}
