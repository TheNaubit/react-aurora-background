import type { CSSProperties, ReactNode } from "react";

type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type HEX = `#${string}`;

/** A CSS color: hex, rgb(), rgba(), hsl(), hsla() or a named color. */
export type Color = RGB | RGBA | HEX | (string & {});

/** The number of bubbles (color blobs) of the aurora. */
export type NumBubbles = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface AuroraBackgroundConfig {
	/** The colors of the bubbles. They repeat when there are more bubbles than colors. */
	colors?: Array<Color>;
	/** The number of bubbles, from 2 to 9. */
	numBubbles?: NumBubbles;
	/** The duration, in seconds, of one animation cycle. */
	animDuration?: number;
	/** How soft the bubbles are: a number of pixels or a CSS length ("10vw", "80px", "20%", "5rem"). */
	blurAmount?: number | string;
	/** The color behind the bubbles. */
	bgColor?: Color;
	/** Adds a small random variation to the size, the speed and the position of each bubble. */
	useRandomness?: boolean;
	/** The maximum number of frames per second (from 1 to 60). The aurora moves slowly, so 30 is smooth and saves energy. */
	fps?: number;
	/** Stops the animation (the current frame stays visible). */
	paused?: boolean;
	/** Shows a still aurora when the user asks for reduced motion (prefers-reduced-motion). */
	respectReducedMotion?: boolean;
	/** Extra styles for the container. */
	style?: CSSProperties;
	/** Extra class names for the container. */
	className?: string;
}

export interface IAuroraBackgroundProvider extends AuroraBackgroundConfig {
	children?: ReactNode;
}
