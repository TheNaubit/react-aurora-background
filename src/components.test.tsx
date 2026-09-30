import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuroraBackground, AuroraBackgroundProvider } from "./index.js";
import {
	createFakeGL,
	mockGetContext,
	mockObservers,
	mockReducedMotion,
} from "./test/fakes.js";

// React act() environment
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
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const canvasOf = () => container.querySelector("canvas") as HTMLCanvasElement;

describe("server rendering", () => {
	it("renders the CSS aurora and the content, without randomness", () => {
		const render = () =>
			renderToString(
				<AuroraBackgroundProvider useRandomness className="app">
					<p>Hello</p>
				</AuroraBackgroundProvider>,
			);
		const html = render();

		expect(html).toContain("radial-gradient(circle at 43.0% 25.0%");
		// The canvas is only created in the browser
		expect(html).not.toContain("<canvas");
		expect(html).toContain("<p>Hello</p>");
		expect(html).toContain('class="app"');
		// The same markup every time, so hydration never mismatches
		expect(render()).toBe(html);
	});
});

describe("AuroraBackground", () => {
	it("keeps the CSS fallback visible without WebGL", () => {
		mockGetContext({});
		act(() => root.render(<AuroraBackground />));
		expect(canvasOf().style.opacity).toBe("0");
		expect(
			(canvasOf().parentElement as HTMLElement).style.background,
		).toContain("radial-gradient");
	});

	it("shows the WebGL canvas when it works", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		act(() => root.render(<AuroraBackground numBubbles={3} />));
		act(() => observers.resize(800, 600));
		expect(canvasOf().style.opacity).toBe("1");
		expect(gl.uniform1i).toHaveBeenLastCalledWith("uCount", 3);
	});

	it("updates the aurora when the props change, but not for equal colors", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		act(() => root.render(<AuroraBackground colors={["#ff0000"]} />));
		act(() => observers.resize(800, 600));
		gl.uniform4fv.mockClear();

		act(() => root.render(<AuroraBackground colors={["#ff0000"]} />));
		expect(gl.uniform4fv).not.toHaveBeenCalled();

		act(() =>
			root.render(<AuroraBackground colors={["#00ff00"]} numBubbles={5} />),
		);
		expect(gl.uniform4fv).toHaveBeenCalled();
		expect(gl.uniform1i).toHaveBeenLastCalledWith("uCount", 5);
	});

	it("works in StrictMode and cleans up when unmounted", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		act(() =>
			root.render(
				<StrictMode>
					<AuroraBackground />
				</StrictMode>,
			),
		);
		expect(canvasOf().style.opacity).toBe("1");

		act(() => root.render(<p>Gone</p>));
		expect(gl.deleteProgram).toHaveBeenCalled();
	});

	it("applies the class name and the styles to the layer", () => {
		mockGetContext({});
		act(() =>
			root.render(
				<AuroraBackground className="aurora" style={{ opacity: 0.5 }} />,
			),
		);
		const layer = canvasOf().parentElement as HTMLElement;
		expect(layer.className).toBe("aurora");
		expect(layer.style.opacity).toBe("0.5");
		expect(layer.getAttribute("aria-hidden")).toBe("true");
	});
});

describe("AuroraBackgroundProvider", () => {
	it("renders the content above the aurora with the class name and the styles", () => {
		mockGetContext({});
		act(() =>
			root.render(
				<AuroraBackgroundProvider
					className="one two"
					style={{ minHeight: 300 }}
				>
					<p>Content</p>
				</AuroraBackgroundProvider>,
			),
		);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toBe("one two");
		expect(wrapper.style.minHeight).toBe("300px");
		expect(wrapper.style.position).toBe("relative");
		expect(container.querySelector("p")?.textContent).toBe("Content");
		expect(
			(container.querySelector("p")?.parentElement as HTMLElement).style.zIndex,
		).toBe("1");
	});
});
