import { describe, expect, it, vi } from "vitest";
import { blobPositionsAt, createBlobPaths, createRandom } from "./blobs.js";
import { blurToPixels } from "./blur.js";
import { parseColor, toCSS } from "./color.js";
import { DEFAULT_ANIM_DURATION, DEFAULT_FPS, resolveConfig } from "./config.js";
import { fallbackBackground } from "./fallback.js";
import { createAnimationLoop } from "./loop.js";

describe("parseColor", () => {
	it.each([
		["#ff0000", [1, 0, 0, 1]],
		["rgb(0, 255, 0)", [0, 1, 0, 1]],
		["rgba(0, 0, 255, 0.5)", [0, 0, 1, 0.5]],
		["hsl(0, 0%, 50%)", [0.5, 0.5, 0.5, 1]],
		["white", [1, 1, 1, 1]],
		["not a color", [0, 0, 0, 0]],
	])("parses %s", (input, expected) => {
		parseColor(input).forEach((channel, index) => {
			expect(channel).toBeCloseTo(expected[index] as number, 5);
		});
	});

	it("converts back to CSS", () => {
		expect(toCSS(parseColor("rgba(255, 0, 0, 0.5)"))).toBe(
			"rgba(255, 0, 0, 0.5)",
		);
	});
});

describe("resolveConfig", () => {
	it("fills the defaults", () => {
		const config = resolveConfig({});
		expect(config.numBubbles).toBe(4);
		expect(config.colors).toHaveLength(4);
		expect(config.animDuration).toBe(DEFAULT_ANIM_DURATION);
		expect(config.fps).toBe(DEFAULT_FPS);
		expect(config.blurAmount).toBe("10vw");
		expect(config.useRandomness).toBe(false);
		expect(config.paused).toBe(false);
		expect(config.respectReducedMotion).toBe(true);
	});

	it("repeats the colors when there are more bubbles than colors", () => {
		const config = resolveConfig({
			colors: ["#ff0000", "#00ff00"],
			numBubbles: 5,
		});
		expect(config.colors.map(toCSS)).toEqual([
			"rgba(255, 0, 0, 1)",
			"rgba(0, 255, 0, 1)",
			"rgba(255, 0, 0, 1)",
			"rgba(0, 255, 0, 1)",
			"rgba(255, 0, 0, 1)",
		]);
	});

	it("clamps invalid values", () => {
		const config = resolveConfig({
			// @ts-expect-error: invalid values on purpose (plain JavaScript callers)
			numBubbles: 42,
			animDuration: -1,
			fps: 1000,
			colors: [],
		});
		expect(config.numBubbles).toBe(9);
		expect(config.animDuration).toBe(DEFAULT_ANIM_DURATION);
		expect(config.fps).toBe(60);
		expect(config.colors).toHaveLength(9);
		// @ts-expect-error: invalid values on purpose (plain JavaScript callers)
		expect(resolveConfig({ numBubbles: 1, fps: Number.NaN }).numBubbles).toBe(
			2,
		);
	});
});

describe("blurToPixels", () => {
	const element = { width: 500, height: 400 };
	const viewport = { width: 1000, height: 800 };

	it.each([
		[80, 80],
		["80px", 80],
		["10vw", 100],
		["10vh", 80],
		["10vmin", 80],
		["10vmax", 100],
		["20%", 100],
		["2rem", 32],
		["2em", 32],
		[" 5 ", 5],
		[-10, 0],
		[Number.NaN, 0],
		["banana", 100],
	])("converts %s", (blur, expected) => {
		expect(blurToPixels(blur, element, viewport)).toBe(expected);
	});
});

describe("blob paths", () => {
	it("lays out the bubbles on a two-column grid", () => {
		const paths = createBlobPaths(3, null);
		expect(paths.map(({ x, y }) => [x, y])).toEqual([
			[0.25, 0.25],
			[0.75, 0.25],
			[0.5, 0.75],
		]);
		expect(paths.map(({ direction }) => direction)).toEqual([1, -1, 1]);
	});

	it("is deterministic for a seed", () => {
		expect(createBlobPaths(4, 42)).toEqual(createBlobPaths(4, 42));
		expect(createBlobPaths(4, 42)).not.toEqual(createBlobPaths(4, 7));
		const random = createRandom(1);
		const values = Array.from({ length: 100 }, random);
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
	});

	it("loops every two cycles and moves in between", () => {
		const paths = createBlobPaths(4, null);
		const start = blobPositionsAt(paths, 0, 10);
		const middle = blobPositionsAt(paths, 10, 10);
		const end = blobPositionsAt(paths, 20, 10);
		expect(Array.from(end)).toEqual(
			Array.from(start).map((value) => expect.closeTo(value, 5)),
		);
		expect(middle[0]).not.toBeCloseTo(start[0] as number, 2);
		expect(start).toHaveLength(12);
	});
});

describe("fallbackBackground", () => {
	it("builds CSS gradients with the bubble colors over the background, at their first frame positions", () => {
		const background = fallbackBackground(
			resolveConfig({
				colors: ["#ff0000", "#00ff00"],
				numBubbles: 2,
				bgColor: "#0000ff",
			}),
		);
		expect(background).toBe(
			"radial-gradient(circle at 75.0% 68.0%, #00ff00 0%, transparent 70%), radial-gradient(circle at 43.0% 50.0%, #ff0000 0%, transparent 70%), #0000ff",
		);
	});
});

describe("createAnimationLoop", () => {
	function fakeFrames() {
		let callback: ((timestamp: number) => void) | null = null;
		let handle = 0;
		return {
			environment: {
				requestFrame: (next: (timestamp: number) => void) => {
					callback = next;
					handle += 1;
					return handle;
				},
				cancelFrame: vi.fn(() => {
					callback = null;
				}),
			},
			frame: (timestamp: number) => callback?.(timestamp),
		};
	}

	it("caps the frame rate and counts time only while running", () => {
		const frames = fakeFrames();
		const onFrame = vi.fn();
		const loop = createAnimationLoop(30, onFrame, frames.environment);

		loop.start();
		loop.start();
		expect(loop.isRunning()).toBe(true);
		// 60 Hz screen: every other frame is drawn at 30 fps
		for (let index = 0; index <= 6; index++) {
			frames.frame(index * (1000 / 60));
		}
		expect(onFrame).toHaveBeenCalledTimes(3);
		expect(loop.time()).toBeCloseTo(0.1, 5);

		loop.stop();
		expect(loop.isRunning()).toBe(false);
		frames.frame(5000);
		expect(onFrame).toHaveBeenCalledTimes(3);

		// Resuming later does not jump
		loop.start();
		frames.frame(10_000);
		frames.frame(10_000 + 1000 / 30);
		expect(loop.time()).toBeCloseTo(0.1 + 1 / 30, 5);
	});

	it("changes the frame rate", () => {
		const frames = fakeFrames();
		const onFrame = vi.fn();
		const loop = createAnimationLoop(60, onFrame, frames.environment);
		loop.setFps(10);
		loop.start();
		for (let index = 0; index <= 12; index++) {
			frames.frame(index * (1000 / 60));
		}
		expect(onFrame).toHaveBeenCalledTimes(2);
	});
});
