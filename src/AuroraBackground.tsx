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

const LAYER_STYLE: CSSProperties = {
	position: "absolute",
	inset: 0,
	overflow: "hidden",
	pointerEvents: "none",
};

const CANVAS_STYLE: CSSProperties = {
	display: "block",
	width: "100%",
	height: "100%",
	transition: "opacity 0.6s ease",
};

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
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const auroraRef = useRef<IAurora | null>(null);
	const [isReady, setIsReady] = useState(false);

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
		const canvas = canvasRef.current;
		if (!canvas) return;
		const aurora = createAurora(canvas, configRef.current, {
			onReadyChange: setIsReady,
		});
		auroraRef.current = aurora;
		return () => {
			aurora.destroy();
			auroraRef.current = null;
		};
	}, []);

	useEffect(() => {
		auroraRef.current?.update(config);
	}, [config]);

	const background = useMemo(() => fallbackBackground(config), [config]);

	return (
		<div
			aria-hidden="true"
			className={className}
			style={{ ...LAYER_STYLE, background, ...style }}
		>
			<canvas
				ref={canvasRef}
				style={{ ...CANVAS_STYLE, opacity: isReady ? 1 : 0 }}
			/>
		</div>
	);
}
