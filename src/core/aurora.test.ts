import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFakeGL,
	mockGetContext,
	mockObservers,
	mockReducedMotion,
	setVisibility,
} from "../test/fakes.js";
import { createAurora, MAX_RENDER_SIZE, renderSize } from "./aurora.js";
import { resolveConfig } from "./config.js";
import { createRenderer } from "./renderer.js";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	setVisibility("visible");
});

describe("renderSize", () => {
	it("keeps the longest side at most MAX_RENDER_SIZE", () => {
		expect(renderSize(1920, 1080)).toEqual([MAX_RENDER_SIZE, 144]);
		expect(renderSize(390, 844)).toEqual([118, MAX_RENDER_SIZE]);
		expect(renderSize(100, 50)).toEqual([100, 50]);
		expect(renderSize(0, 0)).toEqual([1, 1]);
	});
});

describe("createRenderer", () => {
	const frame = {
		background: [0, 0, 1, 1] as const,
		colors: [[1, 0, 0, 1] as const, [0, 1, 0, 1] as const],
		blobs: new Float32Array([0.25, 0.5, 0.4, 0.75, 0.5, 0.4]),
		softness: 0.1,
	};

	it("uses WebGL 2 and draws a frame", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		const canvas = document.createElement("canvas");
		const renderer = createRenderer(canvas);
		expect(renderer).not.toBeNull();

		renderer?.resize(200, 100);
		expect(canvas.width).toBe(200);
		expect(gl.viewport).toHaveBeenCalledWith(0, 0, 200, 100);

		renderer?.render(frame);
		expect(gl.uniform1i).toHaveBeenCalledWith("uCount", 2);
		expect(gl.uniform1f).toHaveBeenCalledWith("uSoftness", 0.1);
		expect(gl.uniform4f).toHaveBeenCalledWith("uBackground", 0, 0, 1, 1);
		expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);

		renderer?.destroy();
		expect(gl.deleteProgram).toHaveBeenCalled();
		expect(gl.deleteBuffer).toHaveBeenCalled();
	});

	it("falls back to WebGL 1", () => {
		const gl = createFakeGL();
		mockGetContext({ webgl2: null, webgl: gl });
		expect(createRenderer(document.createElement("canvas"))).not.toBeNull();
	});

	it.each([
		["WebGL is not available", {}],
		["the context is lost", { webgl2: createFakeGL({ lost: true }) }],
		[
			"a shader does not compile",
			{ webgl2: createFakeGL({ compiles: false }) },
		],
		["the program does not link", { webgl2: createFakeGL({ links: false }) }],
	])("returns null when %s", (_, contexts) => {
		mockGetContext(contexts);
		expect(createRenderer(document.createElement("canvas"))).toBeNull();
	});

	it("returns null when getContext throws", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => {
				throw new Error("blocked");
			},
		);
		expect(createRenderer(document.createElement("canvas"))).toBeNull();
	});
});

describe("createAurora", () => {
	let gl: ReturnType<typeof createFakeGL>;
	let observers: ReturnType<typeof mockObservers>;
	let motion: ReturnType<typeof mockReducedMotion>;
	let frames: Array<(timestamp: number) => void>;

	beforeEach(() => {
		gl = createFakeGL();
		mockGetContext({ webgl2: gl });
		observers = mockObservers();
		motion = mockReducedMotion(false);
		frames = [];
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((callback: (timestamp: number) => void) => {
				frames.push(callback);
				return frames.length;
			}),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	const runFrames = (count: number) => {
		for (let index = 0; index < count; index++) {
			const callback = frames.shift();
			callback?.(index * 40);
		}
	};

	function start(config = resolveConfig({})) {
		const container = document.createElement("div");
		const onReadyChange = vi.fn();
		const aurora = createAurora(container, config, { onReadyChange });
		observers.resize(800, 600);
		const canvas = container.querySelector("canvas") as HTMLCanvasElement;
		return { canvas, aurora, onReadyChange };
	}

	it("renders at a low resolution and animates", () => {
		const { canvas, onReadyChange } = start();
		expect(onReadyChange).toHaveBeenCalledWith(true);
		expect(canvas.width).toBe(256);
		expect(canvas.height).toBe(192);

		gl.drawArrays.mockClear();
		runFrames(4);
		expect(gl.drawArrays).toHaveBeenCalled();
	});

	it("stops rendering off-screen and in hidden pages", () => {
		start();
		observers.intersect(false);
		expect(cancelAnimationFrame).toHaveBeenCalled();

		observers.intersect(true);
		vi.mocked(cancelAnimationFrame).mockClear();
		setVisibility("hidden");
		expect(cancelAnimationFrame).toHaveBeenCalled();
	});

	it("shows a still frame with reduced motion or when paused", () => {
		motion = mockReducedMotion(true);
		const { aurora } = start();
		expect(requestAnimationFrame).not.toHaveBeenCalled();
		expect(gl.drawArrays).toHaveBeenCalled();

		motion.set(false);
		expect(requestAnimationFrame).toHaveBeenCalled();

		vi.mocked(cancelAnimationFrame).mockClear();
		aurora.update(resolveConfig({ paused: true }));
		expect(cancelAnimationFrame).toHaveBeenCalled();
	});

	it("animates with reduced motion when respectReducedMotion is false", () => {
		mockReducedMotion(true);
		start(resolveConfig({ respectReducedMotion: false }));
		expect(requestAnimationFrame).toHaveBeenCalled();
	});

	it("updates the bubbles when the props change", () => {
		const { aurora } = start();
		gl.uniform1i.mockClear();
		aurora.update(resolveConfig({ numBubbles: 6, paused: true }));
		expect(gl.uniform1i).toHaveBeenLastCalledWith("uCount", 6);

		aurora.update(
			resolveConfig({ numBubbles: 6, useRandomness: true, paused: true }),
		);
		expect(gl.drawArrays).toHaveBeenCalled();
	});

	it("shows the fallback when the context is lost and restarts when it is restored", () => {
		const { canvas, onReadyChange } = start();
		const lost = new Event("webglcontextlost", { cancelable: true });
		canvas.dispatchEvent(lost);
		expect(lost.defaultPrevented).toBe(true);
		expect(onReadyChange).toHaveBeenLastCalledWith(false);

		canvas.dispatchEvent(new Event("webglcontextrestored"));
		expect(onReadyChange).toHaveBeenLastCalledWith(true);
	});

	it("reports that WebGL is not available", () => {
		vi.restoreAllMocks();
		mockGetContext({});
		const { onReadyChange } = start();
		expect(onReadyChange).toHaveBeenCalledWith(false);
	});

	it("cleans everything on destroy", () => {
		const { aurora } = start();
		aurora.destroy();
		expect(observers.disconnect).toHaveBeenCalledTimes(2);
		expect(gl.deleteProgram).toHaveBeenCalled();
		expect(motion.query.removeEventListener).toHaveBeenCalled();
	});
});
