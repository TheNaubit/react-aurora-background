import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createAurora, type IAurora } from "./core/aurora.js";
import { resolveConfig } from "./core/config.js";
import { fallbackBackground } from "./core/fallback.js";
import type { AuroraBackgroundConfig } from "./types.js";

// The canvas fades in over the CSS fallback, which is removed once the fade is over
const FADE_MS = 600;

const LAYER_STYLE: CSSProperties = {
	position: "absolute",
	inset: 0,
	overflow: "hidden",
	pointerEvents: "none",
};

function createCanvas(): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.setAttribute("aria-hidden", "true");
	Object.assign(canvas.style, {
		display: "block",
		width: "100%",
		height: "100%",
		opacity: "0",
		transition: `opacity ${FADE_MS}ms ease`,
	});
	return canvas;
}

/**
 * The aurora layer: it fills its closest positioned parent (position: relative, absolute or fixed).
 * Use AuroraBackgroundProvider to wrap content with an aurora behind it.
 *
 * It is drawn by a small WebGL shader at a low resolution. A still CSS version is rendered on the server and stays visible when WebGL is not available.
 */
export function AuroraBackground({
	colors,
	numBubbles,
	animDuration,
	blurAmount,
	bgColor,
	useRandomness,
	fps,
	paused,
	respectReducedMotion,
	style,
	className,
}: AuroraBackgroundConfig) {
	const layerRef = useRef<HTMLDivElement>(null);
	const auroraRef = useRef<IAurora | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [showFallback, setShowFallback] = useState(true);

	// Arrays are compared by value, so a new array with the same colors does not restart anything
	const colorsKey = (colors ?? []).join("|");
	const config = useMemo(
		() =>
			resolveConfig({
				colors: colorsKey === "" ? undefined : colorsKey.split("|"),
				numBubbles,
				animDuration,
				blurAmount,
				bgColor,
				useRandomness,
				fps,
				paused,
				respectReducedMotion,
			}),
		[
			colorsKey,
			numBubbles,
			animDuration,
			blurAmount,
			bgColor,
			useRandomness,
			fps,
			paused,
			respectReducedMotion,
		],
	);
	const configRef = useRef(config);
	configRef.current = config;

	useEffect(() => {
		const layer = layerRef.current;
		if (!layer) return;
		// A new canvas for every mount: a WebGL context can not be used again once it is released
		const canvas = createCanvas();
		layer.append(canvas);
		const aurora = createAurora(canvas, configRef.current, {
			onReadyChange: (ready) => {
				canvas.style.opacity = ready ? "1" : "0";
				setIsReady(ready);
			},
		});
		auroraRef.current = aurora;
		return () => {
			aurora.destroy();
			canvas.remove();
			auroraRef.current = null;
		};
	}, []);

	useEffect(() => {
		auroraRef.current?.update(config);
	}, [config]);

	// The fallback is hidden once the canvas covers it (so translucent auroras do not show it), and shown again as soon as WebGL stops
	useEffect(() => {
		if (!isReady) {
			setShowFallback(true);
			return;
		}
		const timeout = setTimeout(() => setShowFallback(false), FADE_MS);
		return () => clearTimeout(timeout);
	}, [isReady]);

	const background = useMemo(() => fallbackBackground(config), [config]);

	return (
		<div
			ref={layerRef}
			aria-hidden="true"
			className={className}
			style={{
				...LAYER_STYLE,
				...(showFallback ? { background } : {}),
				...style,
			}}
		/>
	);
}
