import { vi } from "vitest";

/** A fake WebGL context that records the calls the renderer makes. */
export function createFakeGL(
	options: { compiles?: boolean; links?: boolean; lost?: boolean } = {},
) {
	const { compiles = true, links = true, lost = false } = options;
	return {
		VERTEX_SHADER: 1,
		FRAGMENT_SHADER: 2,
		COMPILE_STATUS: 3,
		LINK_STATUS: 4,
		ARRAY_BUFFER: 5,
		STATIC_DRAW: 6,
		FLOAT: 7,
		TRIANGLES: 8,
		isContextLost: () => lost,
		createShader: vi.fn(() => ({})),
		shaderSource: vi.fn(),
		compileShader: vi.fn(),
		getShaderParameter: vi.fn(() => compiles),
		deleteShader: vi.fn(),
		createProgram: vi.fn(() => ({})),
		attachShader: vi.fn(),
		linkProgram: vi.fn(),
		getProgramParameter: vi.fn(() => links),
		deleteProgram: vi.fn(),
		createBuffer: vi.fn(() => ({})),
		bindBuffer: vi.fn(),
		bufferData: vi.fn(),
		deleteBuffer: vi.fn(),
		getAttribLocation: vi.fn(() => 0),
		enableVertexAttribArray: vi.fn(),
		vertexAttribPointer: vi.fn(),
		useProgram: vi.fn(),
		getUniformLocation: vi.fn((_program: unknown, name: string) => name),
		uniform1f: vi.fn(),
		uniform1i: vi.fn(),
		uniform2f: vi.fn(),
		uniform4f: vi.fn(),
		uniform3fv: vi.fn(),
		uniform4fv: vi.fn(),
		viewport: vi.fn(),
		drawArrays: vi.fn(),
	};
}

export type FakeGL = ReturnType<typeof createFakeGL>;

/** Makes canvas.getContext return the given contexts ("webgl2" first, then "webgl"). */
export function mockGetContext(contexts: {
	webgl2?: FakeGL | null;
	webgl?: FakeGL | null;
}) {
	return vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockImplementation(
			((type: string) =>
				(type === "webgl2"
					? contexts.webgl2
					: type === "webgl"
						? contexts.webgl
						: null) ?? null) as unknown as HTMLCanvasElement["getContext"],
		);
}

type ObserverCallback = (entries: Array<Record<string, unknown>>) => void;

/** Replaces ResizeObserver and IntersectionObserver with fakes that tests can trigger. */
export function mockObservers() {
	const resize: Array<ObserverCallback> = [];
	const intersection: Array<ObserverCallback> = [];
	const disconnect = vi.fn();

	class FakeResizeObserver {
		constructor(callback: ObserverCallback) {
			resize.push(callback);
		}
		observe() {}
		disconnect = disconnect;
	}
	class FakeIntersectionObserver {
		constructor(callback: ObserverCallback) {
			intersection.push(callback);
		}
		observe() {}
		disconnect = disconnect;
	}

	vi.stubGlobal("ResizeObserver", FakeResizeObserver);
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

	return {
		resize: (width: number, height: number) => {
			for (const callback of resize)
				callback([{ contentRect: { width, height } }]);
		},
		intersect: (isIntersecting: boolean) => {
			for (const callback of intersection) callback([{ isIntersecting }]);
		},
		disconnect,
	};
}

/** Replaces matchMedia with one that reports the reduced motion preference. */
export function mockReducedMotion(initial: boolean) {
	const listeners: Array<() => void> = [];
	const query = {
		matches: initial,
		addEventListener: (_type: string, listener: () => void) => {
			listeners.push(listener);
		},
		removeEventListener: vi.fn(),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => query),
	);
	return {
		set: (matches: boolean) => {
			query.matches = matches;
			for (const listener of listeners) listener();
		},
		query,
	};
}

/** Sets document.visibilityState and dispatches visibilitychange. */
export function setVisibility(state: "visible" | "hidden") {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => state,
	});
	document.dispatchEvent(new Event("visibilitychange"));
}
