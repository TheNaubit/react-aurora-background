import { afterEach, describe, expect, it, vi } from "vitest";
import { createColorResolver, rasterizeColor } from "./color.js";
import { isSafeColorSyntax } from "./fallback.js";

afterEach(() => {
	vi.restoreAllMocks();
});

function mockCanvas2D(pixel: Array<number> | null) {
	return vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockImplementation((() =>
			pixel === null
				? null
				: {
						fillStyle: "",
						fillRect: vi.fn(),
						getImageData: () => ({ data: new Uint8ClampedArray(pixel) }),
					}) as unknown as HTMLCanvasElement["getContext"]);
}

describe("rasterizeColor", () => {
	it("draws the color and reads it back", () => {
		mockCanvas2D([255, 128, 0, 255]);
		const color = rasterizeColor("rgb(255, 128, 0)");
		expect(color?.map((channel) => Number(channel.toFixed(3)))).toEqual([
			1, 0.502, 0, 1,
		]);
	});

	it("returns null when there is no 2D canvas", () => {
		mockCanvas2D(null);
		expect(rasterizeColor("rgb(1, 2, 3)")).toBeNull();
	});

	it("returns null when the browser throws", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => {
				throw new Error("blocked");
			},
		);
		expect(rasterizeColor("rgb(1, 2, 3)")).toBeNull();
	});
});

describe("createColorResolver", () => {
	it("keeps one hidden probe per color and removes them on dispose", () => {
		const element = document.createElement("div");
		const resolve = createColorResolver(element, () => [1, 0, 0, 1]);
		resolve("rgb(255, 0, 0)");
		resolve("rgb(255, 0, 0)");
		expect(element.querySelectorAll("span")).toHaveLength(1);
		expect((element.querySelector("span") as HTMLElement).style.display).toBe(
			"none",
		);
		resolve.dispose();
		expect(element.querySelectorAll("span")).toHaveLength(0);
	});

	it("is transparent when the browser can not draw the color", () => {
		const resolve = createColorResolver(
			document.createElement("div"),
			() => null,
		);
		expect(resolve("rgb(1, 2, 3)")).toEqual([0, 0, 0, 0]);
	});
});

describe("isSafeColorSyntax", () => {
	it.each([
		"oklch(70% 0.2 30)",
		"color(display-p3 1 0 0)",
		"var(--brand)",
		"hsl(var(--hue) 50% 50%)",
		"color-mix(in oklab, red 50%, blue)",
		"light-dark(white, black)",
		"rgb(calc(255 / 2) 0 0)",
		"currentColor",
		"CanvasText",
	])("accepts %s", (value) => {
		expect(isSafeColorSyntax(value)).toBe(true);
	});

	it.each([
		"nope",
		"url(http://host/x)",
		"red 0%, transparent 70%), url(http://host/PING), radial-gradient(red",
		"var(--a), url(x)",
		"rgb(1 2 3)) , url(x",
		"rgb(1 2 3",
		"image(red)",
		"rgb(1 2 3); background: red",
		"oklch(70% 0.2 30) oklch(1 1 1)",
		"rgb(1 2 3)rgb(4 5 6)",
	])("rejects %s", (value) => {
		expect(isSafeColorSyntax(value)).toBe(false);
	});
});
