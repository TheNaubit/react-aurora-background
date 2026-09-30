import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAurora } from "./core/aurora.js";
import { resolveConfig } from "./core/config.js";
import { fallbackStyle } from "./core/fallback.js";
import { AuroraBackground } from "./index.js";
import {
	createFakeGL,
	mockGetContext,
	mockObservers,
	mockReducedMotion,
} from "./test/fakes.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let observers: ReturnType<typeof mockObservers>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	observers = mockObservers();
	mockReducedMotion(true);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const glWithLoseContext = () => {
	const loseContext = vi.fn();
	const gl = {
		...createFakeGL(),
		getExtension: vi.fn(() => ({ loseContext })),
	};
	return { gl, loseContext };
};

describe("WebGL contexts", () => {
	it("releases the context and removes the canvas on unmount", () => {
		const { gl, loseContext } = glWithLoseContext();
		mockGetContext({ webgl2: gl });
		act(() => root.render(<AuroraBackground />));
		expect(container.querySelectorAll("canvas")).toHaveLength(1);

		act(() => root.render(<p>Gone</p>));
		expect(loseContext).toHaveBeenCalled();
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("uses a new canvas for each mount, so StrictMode keeps working", () => {
		const { gl } = glWithLoseContext();
		mockGetContext({ webgl2: gl });
		act(() =>
			root.render(
				<StrictMode>
					<AuroraBackground />
				</StrictMode>,
			),
		);
		act(() => observers.resize(800, 600));
		const canvases = container.querySelectorAll("canvas");
		expect(canvases).toHaveLength(1);
		expect((canvases[0] as HTMLCanvasElement).style.opacity).toBe("1");
	});
});

describe("fallback", () => {
	it("is removed once the canvas is visible, and comes back when WebGL stops", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		act(() => root.render(<AuroraBackground bgColor="transparent" />));
		act(() => observers.resize(800, 600));
		const layer = container.firstElementChild as HTMLElement;
		expect(layer.style.backgroundImage).toContain("radial-gradient");

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(layer.style.backgroundImage).toBe("");

		const canvas = container.querySelector("canvas") as HTMLCanvasElement;
		act(() => {
			canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
		});
		expect(layer.style.backgroundImage).toContain("radial-gradient");
	});

	it("places the bubbles where the first WebGL frame draws them", () => {
		const { backgroundImage } = fallbackStyle(resolveConfig({ numBubbles: 2 }));
		// The first bubble orbits around (25%, 50%): at t=0 it is at phase 0, 18% to the right
		expect(backgroundImage).toContain("at 43.0% 50.0%");
	});

	it("uses the CSS colors as written, so any CSS color works on the server", () => {
		const html = renderToString(
			<AuroraBackground
				colors={["oklch(70% 0.2 30)", "var(--brand)"]}
				numBubbles={2}
			/>,
		);
		expect(html).toContain("oklch(70% 0.2 30)");
		expect(html).toContain("var(--brand)");
	});
});

describe("colors the parser does not know", () => {
	it("are resolved by the browser", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		const container = document.createElement("div");
		document.body.append(container);
		const resolve = vi.fn(() => [1, 0.5, 0, 1] as const);
		createAurora(
			container,
			resolveConfig({
				colors: ["oklch(70% 0.2 30)"],
				numBubbles: 2,
				paused: true,
			}),
			{
				onReadyChange: () => {},
				createResolver: () => Object.assign(resolve, { dispose: vi.fn() }),
			},
		);
		observers.resize(800, 600);
		expect(resolve).toHaveBeenCalledWith("oklch(70% 0.2 30)");
		const colors = gl.uniform4fv.mock.calls.at(-1)?.[1] as Float32Array;
		expect(Array.from(colors.slice(0, 4))).toEqual([1, 0.5, 0, 1]);
		container.remove();
	});
});

describe("zero size", () => {
	it("does not run the frame loop without a size", () => {
		mockReducedMotion(false);
		mockGetContext({ webgl2: createFakeGL() });
		const requestFrame = vi.fn(() => 1);
		vi.stubGlobal("requestAnimationFrame", requestFrame);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		createAurora(document.createElement("div"), resolveConfig({}), {
			onReadyChange: () => {},
		});
		observers.resize(0, 0);
		expect(requestFrame).not.toHaveBeenCalled();
		observers.resize(800, 600);
		expect(requestFrame).toHaveBeenCalled();
	});
});

describe("old Safari", () => {
	it("uses addListener when media queries have no addEventListener", () => {
		const addListener = vi.fn();
		const removeListener = vi.fn();
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: false, addListener, removeListener })),
		);
		mockGetContext({ webgl2: createFakeGL() });
		const aurora = createAurora(
			document.createElement("div"),
			resolveConfig({}),
			{ onReadyChange: () => {} },
		);
		expect(addListener).toHaveBeenCalled();
		aurora.destroy();
		expect(removeListener).toHaveBeenCalled();
	});
});
