import { blobPositionsAt, createBlobPaths } from "./blobs.js";
import type { IResolvedConfig } from "./config.js";

/**
 * A still aurora made of CSS gradients, matching the first WebGL frame: it is rendered on the server (no flash before the shader starts) and it is the fallback when WebGL is not available.
 * The colors are used as written, so any CSS color (oklch(), var()...) works.
 */
export function fallbackBackground(config: IResolvedConfig): string {
	const positions = blobPositionsAt(
		createBlobPaths(config.numBubbles, null),
		0,
		config.animDuration,
	);
	const gradients = config.colorSources.map((color, index) => {
		const x = ((positions[index * 3] as number) * 100).toFixed(1);
		const y = ((positions[index * 3 + 1] as number) * 100).toFixed(1);
		return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent 70%)`;
	});

	// The last bubble is drawn on top (the first CSS gradient is the top layer)
	return [...gradients.reverse(), config.bgColorSource].join(", ");
}
