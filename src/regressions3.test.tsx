import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAurora } from "./core/aurora.js";
import { createColorResolver } from "./core/color.js";
import { resolveConfig } from "./core/config.js";
import { isSafeColorSyntax } from "./core/fallback.js";
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

beforeEach(() => {
	mockObservers();
	mockReducedMotion(true);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

const loseContext = (container: HTMLElement) =>
	(container.querySelector("canvas") as HTMLCanvasElement).dispatchEvent(
		new Event("webglcontextlost", { cancelable: true }),
	);

describe("fallback layers", () => {
	it("gives every bubble its own layer, so an invalid color only hides itself", () => {
		const html = renderToString(
			<AuroraBackground colors={["red", "hsl(120 50%)"]} numBubbles={2} />,
		);
		const layers = html.match(/background-image:radial-gradient/g) ?? [];
		expect(layers).toHaveLength(2);
		expect(html).toContain("rgba(255, 0, 0, 1)");
	});

	it("draws the canvas above the fallback layers", () => {
		mockGetContext({ webgl2: createFakeGL() });
		const container = document.createElement("div");
		document.body.append(container);
		const root: Root = createRoot(container);
		act(() => root.render(<AuroraBackground />));
		const canvas = container.querySelector("canvas") as HTMLCanvasElement;
		expect(canvas.style.position).toBe("absolute");
		expect(canvas.style.zIndex).toBe("1");
		act(() => root.unmount());
	});
});

describe("new canvases", () => {
	it("reset their budget once a context has worked for a while", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		const container = document.createElement("div");
		document.body.append(container);
		const onReadyChange = vi.fn();
		createAurora(container, resolveConfig({}), { onReadyChange });

		for (let loss = 0; loss < 6; loss++) {
			loseContext(container);
			vi.advanceTimersByTime(1500);
			expect(onReadyChange).toHaveBeenLastCalledWith(true);
			vi.advanceTimersByTime(60_000);
		}
	});

	it("are not created when the page already has many WebGL contexts", () => {
		vi.useFakeTimers();
		mockGetContext({ webgl2: createFakeGL() });
		const containers = Array.from({ length: 20 }, () => {
			const container = document.createElement("div");
			document.body.append(container);
			createAurora(container, resolveConfig({}), { onReadyChange: () => {} });
			return container;
		});
		const evicted = containers.slice(0, 4);
		const before = evicted.map(
			(container) => container.querySelector("canvas") as HTMLCanvasElement,
		);
		for (const container of evicted) loseContext(container);
		vi.advanceTimersByTime(1500);
		evicted.forEach((container, index) => {
			expect(container.querySelector("canvas")).toBe(before[index]);
		});
	});
});

describe("color probes", () => {
	it("are removed when their color is not used anymore, and invalid colors are cached", () => {
		const element = document.createElement("div");
		const resolve = createColorResolver(element, () => [1, 0, 0, 1]);
		resolve("rgb(1, 2, 3)");
		resolve("rgb(4, 5, 6)");
		resolve.retain(["rgb(4, 5, 6)"]);
		expect(element.querySelectorAll("span")).toHaveLength(1);

		const createElement = vi.spyOn(document, "createElement");
		resolve("definitely not a color");
		resolve("definitely not a color");
		expect(createElement).toHaveBeenCalledTimes(1);
	});
});

describe("isSafeColorSyntax", () => {
	it("stays fast with very long values", () => {
		const start = performance.now();
		expect(isSafeColorSyntax(`rgb(${"a".repeat(100_000)} x)`)).toBe(false);
		expect(isSafeColorSyntax(`${"a".repeat(100_000)}(`)).toBe(false);
		expect(performance.now() - start).toBeLessThan(100);
	});
});
