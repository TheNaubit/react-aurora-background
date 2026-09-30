import { MAX_BUBBLES } from "./config.js";

// GLSL ES 1.00 runs on WebGL 1 and WebGL 2, so one shader covers every browser with WebGL.

/** A triangle that covers the whole canvas. */
export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Each bubble is a soft gaussian blob, and the colors are averaged by weight: a mesh gradient like the original blurred CSS bubbles.
 * A little noise (dithering) removes the banding of smooth gradients.
 */
export const FRAGMENT_SHADER = `
precision mediump float;

#define MAX_BUBBLES ${MAX_BUBBLES}
// How much the background color shows between the bubbles
#define BACKGROUND_WEIGHT 0.12

uniform vec2 uResolution;
uniform vec4 uBackground;
uniform vec4 uColors[MAX_BUBBLES];
uniform vec3 uBlobs[MAX_BUBBLES];
uniform int uCount;
uniform float uSoftness;

varying vec2 vUv;

float hash(vec2 point) {
	return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
	// Positions are fractions of the larger side, with y going down like in CSS
	vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
	vec2 point = vec2(vUv.x, 1.0 - vUv.y) * aspect;
	// A weighted average of the colors (premultiplied): each bubble dominates around its center and blends smoothly with its neighbours, whatever the drawing order
	vec4 sum = vec4(uBackground.rgb * uBackground.a, uBackground.a) * BACKGROUND_WEIGHT;
	float total = BACKGROUND_WEIGHT;

	for (int index = 0; index < MAX_BUBBLES; index++) {
		if (index >= uCount) break;
		vec2 center = uBlobs[index].xy * aspect;
		float radius = uBlobs[index].z + uSoftness;
		float distance = length(point - center) / radius;
		float weight = exp(-3.0 * distance * distance);
		vec4 bubble = uColors[index];
		sum += vec4(bubble.rgb * bubble.a, bubble.a) * weight;
		total += weight;
	}

	vec4 color = sum / total;
	float noise = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
	gl_FragColor = vec4(color.rgb + noise * color.a, color.a);
}
`;
