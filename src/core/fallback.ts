import { createBlobPaths } from "./blobs.js";
import { toCSS } from "./color.js";
import type { IResolvedConfig } from "./config.js";

/**
 * A still aurora made of CSS gradients: it is rendered on the server (no flash before the shader starts) and it is the fallback when WebGL is not available.
 */
export function fallbackBackground(config: IResolvedConfig): string {
	const paths = createBlobPaths(config.numBubbles, null);
	const gradients = paths.map((path, index) => {
		const color = config.colors[index] as IResolvedConfig["bgColor"];
		const transparent = toCSS([color[0], color[1], color[2], 0]);
		const x = (path.x * 100).toFixed(1);
		const y = (path.y * 100).toFixed(1);
		return `radial-gradient(circle at ${x}% ${y}%, ${toCSS(color)} 0%, ${transparent} 55%)`;
	});

	// The last bubble is drawn on top, like in the shader (the first CSS gradient is the top layer)
	return [...gradients.reverse(), toCSS(config.bgColor)].join(", ");
}
