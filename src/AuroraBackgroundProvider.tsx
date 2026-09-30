import type { CSSProperties } from "react";
import { AuroraBackground } from "./AuroraBackground.js";
import type { IAuroraBackgroundProvider } from "./types.js";

const CONTAINER_STYLE: CSSProperties = {
	position: "relative",
	width: "100%",
	height: "100%",
	// The aurora and the content get their own stacking context
	isolation: "isolate",
};

const CONTENT_STYLE: CSSProperties = {
	position: "relative",
	zIndex: 1,
	width: "100%",
	height: "100%",
};

/**
 * Wraps content with an aurora behind it. The container fills its parent (100% width and height): give the parent a size.
 */
export function AuroraBackgroundProvider({
	children,
	style,
	className,
	...config
}: IAuroraBackgroundProvider) {
	return (
		<div className={className} style={{ ...CONTAINER_STYLE, ...style }}>
			<AuroraBackground {...config} />
			<div style={CONTENT_STYLE}>{children}</div>
		</div>
	);
}
