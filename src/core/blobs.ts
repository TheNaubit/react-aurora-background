/** The path a bubble follows. Positions and sizes are fractions of the element (0 to 1). */
export interface IBlobPath {
	// The center of the orbit
	x: number;
	y: number;
	// The orbit radius
	orbit: number;
	// The starting angle of the orbit
	phase: number;
	// 1 or -1: neighbour bubbles turn in opposite directions
	direction: number;
	// The size of the bubble
	radius: number;
	// A speed multiplier (1 without randomness)
	speed: number;
}

const BASE_RADIUS = 0.5;
const BASE_ORBIT = 0.18;

/**
 * A small deterministic pseudo-random generator (mulberry32), so the same seed always gives the same aurora.
 */
export function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Lays out the bubbles on a two-column grid (like the original CSS version), each one orbiting around its cell.
 *
 * @param count - The number of bubbles.
 * @param seed - A seed for small random variations, or null for the default layout.
 */
export function createBlobPaths(
	count: number,
	seed: number | null,
): Array<IBlobPath> {
	const random = seed === null ? null : createRandom(seed);
	const vary = (amount: number) => (random ? (random() * 2 - 1) * amount : 0);
	const rows = Math.ceil(count / 2);

	return Array.from({ length: count }, (_, index) => {
		const column = index % 2;
		const row = Math.floor(index / 2);
		// A single bubble on the last row is centered
		const isAlone = column === 0 && index === count - 1;

		return {
			x: (isAlone ? 0.5 : column * 0.5 + 0.25) + vary(0.04),
			y: (row + 0.5) / rows + vary(0.04),
			orbit: BASE_ORBIT * (1 + vary(0.2)),
			phase: (index * Math.PI) / 2 + vary(0.5),
			direction: index % 2 === 0 ? 1 : -1,
			radius: BASE_RADIUS * (1 + vary(0.08)),
			speed: 1 + vary(0.05),
		};
	});
}

/**
 * The position of every bubble at a given time.
 * Each bubble goes half a turn and comes back with an ease-in-out, so the animation loops every two cycles, like the original CSS version.
 *
 * @param paths - The bubble paths.
 * @param time - The elapsed time, in seconds.
 * @param duration - The duration of one cycle, in seconds.
 * @returns x, y and radius of each bubble, one after the other.
 */
export function blobPositionsAt(
	paths: ReadonlyArray<IBlobPath>,
	time: number,
	duration: number,
): Float32Array {
	const positions = new Float32Array(paths.length * 3);

	paths.forEach((path, index) => {
		// 0 -> 1 -> 0 over two cycles, with an ease-in-out
		const progress =
			(1 - Math.cos((Math.PI * time * path.speed) / duration)) / 2;
		const angle = path.phase + path.direction * Math.PI * progress;
		positions[index * 3] = path.x + Math.cos(angle) * path.orbit;
		positions[index * 3 + 1] = path.y + Math.sin(angle) * path.orbit;
		positions[index * 3 + 2] = path.radius;
	});

	return positions;
}
