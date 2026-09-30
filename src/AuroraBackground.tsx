import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createAurora, type IAurora } from "./core/aurora.js";
import { resolveConfig } from "./core/config.js";
import { FADE_MS } from "./core/dom.js";
import { fallbackStyle } from "./core/fallback.js";
import type { AuroraBackgroundConfig } from "./types.js";

const LAYER_STYLE: CSSProperties = {
	position: "absolute",
	inset: 0,
	overflow: "hidden",
	pointerEvents: "none",
};

const FALLBACK_LAYER_STYLE: CSSProperties = {
	position: "absolute",
	inset: 0,
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
		// The aurora creates its canvas (a new one for every mount: a WebGL context can not be used again once it is released)
		const aurora = createAurora(layer, configRef.current, {
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

	// The fallback is hidden once the canvas covers it (so translucent auroras do not show it), and shown again as soon as WebGL stops
	useEffect(() => {
		if (!isReady) {
			setShowFallback(true);
			return;
		}
		const timeout = setTimeout(() => setShowFallback(false), FADE_MS);
		return () => clearTimeout(timeout);
	}, [isReady]);

	const fallback = useMemo(() => fallbackStyle(config), [config]);

	return (
		<div
			ref={layerRef}
			aria-hidden="true"
			className={className}
			style={{
				...LAYER_STYLE,
				...(showFallback ? { backgroundColor: fallback.backgroundColor } : {}),
				...style,
			}}
		>
			{showFallback &&
				fallback.layers.map((backgroundImage, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: the layers are only replaced, never reordered
						key={index}
						style={{ ...FALLBACK_LAYER_STYLE, backgroundImage }}
					/>
				))}
		</div>
	);
}
