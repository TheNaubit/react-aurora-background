import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveColorInBrowser } from "./color.js";

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

describe("resolveColorInBrowser", () => {
	it("draws the color and reads it back", () => {
		mockCanvas2D([255, 128, 0, 255]);
		const element = document.createElement("div");
		document.body.append(element);
		const color = resolveColorInBrowser("rgb(255, 128, 0)", element);
		expect(color?.map((channel) => Number(channel.toFixed(3)))).toEqual([
			1, 0.502, 0, 1,
		]);
		element.remove();
	});

	it("returns null when there is no 2D canvas", () => {
		mockCanvas2D(null);
		expect(
			resolveColorInBrowser("rgb(1, 2, 3)", document.createElement("div")),
		).toBeNull();
	});

	it("returns null for values that are not colors", () => {
		expect(
			resolveColorInBrowser(
				"not a color at all",
				document.createElement("div"),
			),
		).toBeNull();
	});

	it("returns null when the browser throws", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => {
				throw new Error("blocked");
			},
		);
		expect(
			resolveColorInBrowser("rgb(1, 2, 3)", document.createElement("div")),
		).toBeNull();
	});
});
