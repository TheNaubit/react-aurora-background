// The canvas fades in over the CSS fallback
export const FADE_MS = 600;

/** The canvas of the aurora: it fills its container and fades in once WebGL works. */
export function createCanvas(): HTMLCanvasElement {
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

// Safari 13 and older only have addListener and removeListener on media queries
type LegacyMediaQueryList = MediaQueryList & {
	addListener?: (listener: () => void) => void;
	removeListener?: (listener: () => void) => void;
};

export function listenTo(
	query: LegacyMediaQueryList | null,
	listener: () => void,
): void {
	if (!query) return;
	if (typeof query.addEventListener === "function") {
		query.addEventListener("change", listener);
	} else {
		query.addListener?.(listener);
	}
}

export function stopListeningTo(
	query: LegacyMediaQueryList | null,
	listener: () => void,
): void {
	if (!query) return;
	if (typeof query.removeEventListener === "function") {
		query.removeEventListener("change", listener);
	} else {
		query.removeListener?.(listener);
	}
}

export function reducedMotionQuery(): LegacyMediaQueryList | null {
	return typeof matchMedia === "function"
		? matchMedia("(prefers-reduced-motion: reduce)")
		: null;
}
