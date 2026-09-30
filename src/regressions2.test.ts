import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAurora } from "./core/aurora.js";
import { createColorResolver } from "./core/color.js";
import { resolveConfig } from "./core/config.js";
import { fallbackStyle } from "./core/fallback.js";
import { createRenderer } from "./core/renderer.js";
import {
	createFakeGL,
	mockGetContext,
	mockObservers,
	mockReducedMotion,
} from "./test/fakes.js";

let observers: ReturnType<typeof mockObservers>;

beforeEach(() => {
	observers = mockObservers();
	mockReducedMotion(true);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

function mountContainer() {
	const container = document.createElement("div");
	document.body.append(container);
	return container;
}

describe("browser colors", () => {
	it("are resolved again when their computed value changes", () => {
		const container = mountContainer();
		let computed = "rgb(255, 0, 0)";
		vi.spyOn(window, "getComputedStyle").mockImplementation(
			() => ({ backgroundColor: computed }) as CSSStyleDeclaration,
		);
		const rasterize = vi.fn((value: string) =>
			value === "rgb(255, 0, 0)"
				? ([1, 0, 0, 1] as const)
				: ([0, 0, 1, 1] as const),
		);
		const resolve = createColorResolver(container, rasterize);

		expect(resolve("var(--brand)")).toEqual([1, 0, 0, 1]);
		expect(resolve("var(--brand)")).toEqual([1, 0, 0, 1]);
		expect(rasterize).toHaveBeenCalledTimes(1);

		computed = "rgb(0, 0, 255)";
		expect(resolve("var(--brand)")).toEqual([0, 0, 1, 1]);
		expect(rasterize).toHaveBeenCalledTimes(2);
	});

	it("are transparent when the value is not a color", () => {
		const container = mountContainer();
		const resolve = createColorResolver(container, () => [1, 1, 1, 1]);
		expect(resolve("definitely not a color")).toEqual([0, 0, 0, 0]);
	});

	it("redraw a still aurora when a page color changes, without a frame loop", () => {
		vi.useFakeTimers();
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		const container = mountContainer();
		let brand: readonly [number, number, number, number] = [1, 0, 0, 1];
		const resolve = Object.assign(
			vi.fn(() => brand),
			{ dispose: vi.fn(), retain: vi.fn() },
		);
		const requestFrame = vi.fn(() => 1);
		vi.stubGlobal("requestAnimationFrame", requestFrame);
		createAurora(
			container,
			resolveConfig({ colors: ["var(--brand)"], numBubbles: 2, paused: true }),
			{ onReadyChange: () => {}, createResolver: () => resolve },
		);
		observers.resize(800, 600);
		gl.drawArrays.mockClear();

		vi.advanceTimersByTime(3000);
		expect(gl.drawArrays).not.toHaveBeenCalled();

		brand = [0, 0, 1, 1];
		vi.advanceTimersByTime(1000);
		expect(gl.drawArrays).toHaveBeenCalledTimes(1);
		expect(requestFrame).not.toHaveBeenCalled();
	});

	it("do not check anything while still with ordinary colors", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
		createAurora(mountContainer(), resolveConfig({ paused: true }), {
			onReadyChange: () => {},
		});
		observers.resize(800, 600);
		expect(setIntervalSpy).not.toHaveBeenCalled();
	});
});

describe("lost contexts that are not restored", () => {
	it("get a new canvas, a limited number of times", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		const container = mountContainer();
		const onReadyChange = vi.fn();
		const aurora = createAurora(container, resolveConfig({}), {
			onReadyChange,
		});
		const first = container.querySelector("canvas") as HTMLCanvasElement;

		first.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
		expect(onReadyChange).toHaveBeenLastCalledWith(false);
		vi.advanceTimersByTime(1500);

		const second = container.querySelector("canvas") as HTMLCanvasElement;
		expect(second).not.toBe(first);
		expect(container.querySelectorAll("canvas")).toHaveLength(1);
		expect(onReadyChange).toHaveBeenLastCalledWith(true);

		// Three more losses: only the first ones get a new canvas
		for (let attempt = 0; attempt < 3; attempt++) {
			(container.querySelector("canvas") as HTMLCanvasElement).dispatchEvent(
				new Event("webglcontextlost", { cancelable: true }),
			);
			vi.advanceTimersByTime(1500);
		}
		expect(onReadyChange).toHaveBeenLastCalledWith(false);

		aurora.destroy();
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("are not replaced when the browser restores them", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		const container = mountContainer();
		createAurora(container, resolveConfig({}), { onReadyChange: () => {} });
		const canvas = container.querySelector("canvas") as HTMLCanvasElement;
		canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
		canvas.dispatchEvent(new Event("webglcontextrestored"));
		vi.advanceTimersByTime(1500);
		expect(container.querySelector("canvas")).toBe(canvas);
	});
});

describe("fallback style", () => {
	it("skips colors that are not valid, so the rest still shows", () => {
		const style = fallbackStyle(
			resolveConfig({ colors: ["red", "nope"], numBubbles: 2 }),
		);
		expect(style.layers.join(", ")).toContain("rgba(255, 0, 0, 1)");
		expect(style.layers.join(", ")).not.toContain("nope");
		expect(style.backgroundColor).toBe("rgba(63, 94, 251, 1)");
	});

	it("never injects other CSS through a color", () => {
		const style = fallbackStyle(
			resolveConfig({
				colors: [
					"red 0%, transparent 70%), url(http://host/PING), radial-gradient(red",
					"oklch(70% 0.2 30)",
				],
				bgColor: "url(http://host/x)",
				numBubbles: 2,
			}),
		);
		expect(style.layers.join(", ")).not.toContain("url(");
		expect(style.layers.join(", ")).toContain("oklch(70% 0.2 30)");
		expect(style.backgroundColor).toBe("transparent");
	});

	it("keeps CSS variables and modern colors as written", () => {
		const style = fallbackStyle(
			resolveConfig({
				colors: ["var(--brand)", "color-mix(in oklab, red 50%, blue)"],
				bgColor: "hsl(var(--hue) 50% 50%)",
				numBubbles: 2,
			}),
		);
		expect(style.layers.join(", ")).toContain("var(--brand)");
		expect(style.layers.join(", ")).toContain(
			"color-mix(in oklab, red 50%, blue)",
		);
		expect(style.backgroundColor).toBe("hsl(var(--hue) 50% 50%)");
	});
});

describe("renderer cleanup", () => {
	it("does not release a context that is already lost", () => {
		const loseContext = vi.fn();
		let lost = false;
		const gl = {
			...createFakeGL(),
			isContextLost: () => lost,
			getExtension: vi.fn(() => ({ loseContext })),
		};
		mockGetContext({ webgl2: gl });
		const renderer = createRenderer(document.createElement("canvas"));
		lost = true;
		renderer?.destroy();
		expect(loseContext).not.toHaveBeenCalled();
	});
});
