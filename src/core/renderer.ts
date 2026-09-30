import type { RGBA } from "./color.js";
import { MAX_BUBBLES } from "./config.js";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders.js";

/** Everything needed to draw one frame. */
export interface IFrame {
	background: RGBA;
	colors: ReadonlyArray<RGBA>;
	// x, y and radius of each bubble
	blobs: Float32Array;
	// Extra radius from the blur amount, as a fraction of the larger side
	softness: number;
}

export interface IRenderer {
	resize(width: number, height: number): void;
	render(frame: IFrame): void;
	destroy(): void;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const CONTEXT_OPTIONS: WebGLContextAttributes = {
	alpha: true,
	premultipliedAlpha: true,
	antialias: false,
	depth: false,
	stencil: false,
	preserveDrawingBuffer: false,
	// The integrated GPU is enough and saves battery on laptops with two GPUs
	powerPreference: "low-power",
};

function getContext(canvas: HTMLCanvasElement): GL | null {
	try {
		return (
			(canvas.getContext(
				"webgl2",
				CONTEXT_OPTIONS,
			) as WebGL2RenderingContext | null) ??
			(canvas.getContext(
				"webgl",
				CONTEXT_OPTIONS,
			) as WebGLRenderingContext | null)
		);
	} catch {
		return null;
	}
}

function compile(gl: GL, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(gl: GL): WebGLProgram | null {
	const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
	const program = vertex && fragment ? gl.createProgram() : null;

	if (program && vertex && fragment) {
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
	}
	if (vertex) gl.deleteShader(vertex);
	if (fragment) gl.deleteShader(fragment);

	if (program && !gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

/**
 * Creates the WebGL renderer of the aurora (WebGL 2, or WebGL 1 on older browsers).
 *
 * @returns The renderer, or null when WebGL is not available (the CSS fallback stays visible).
 */
export function createRenderer(canvas: HTMLCanvasElement): IRenderer | null {
	const gl = getContext(canvas);
	if (!gl || gl.isContextLost()) return null;

	const program = createProgram(gl);
	const buffer = gl.createBuffer();
	if (!program || !buffer) return null;

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	const position = gl.getAttribLocation(program, "aPosition");
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	gl.useProgram(program);

	const location = (name: string) => gl.getUniformLocation(program, name);
	const uniforms = {
		resolution: location("uResolution"),
		background: location("uBackground"),
		colors: location("uColors"),
		blobs: location("uBlobs"),
		count: location("uCount"),
		softness: location("uSoftness"),
	};
	const colors = new Float32Array(MAX_BUBBLES * 4);
	const blobs = new Float32Array(MAX_BUBBLES * 3);

	return {
		resize(width, height) {
			canvas.width = width;
			canvas.height = height;
			gl.viewport(0, 0, width, height);
		},
		render(frame) {
			const count = Math.min(MAX_BUBBLES, frame.colors.length);
			colors.fill(0);
			frame.colors.slice(0, count).forEach((color, index) => {
				colors.set(color, index * 4);
			});
			blobs.fill(0);
			blobs.set(frame.blobs.subarray(0, count * 3));

			gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
			gl.uniform4f(uniforms.background, ...frame.background);
			gl.uniform4fv(uniforms.colors, colors);
			gl.uniform3fv(uniforms.blobs, blobs);
			gl.uniform1i(uniforms.count, count);
			gl.uniform1f(uniforms.softness, frame.softness);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		destroy() {
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			// Browsers keep a limited number of WebGL contexts (about 16): release this one now instead of waiting for the garbage collector, or other auroras get evicted
			if (!gl.isContextLost()) {
				gl.getExtension("WEBGL_lose_context")?.loseContext();
			}
		},
	};
}
