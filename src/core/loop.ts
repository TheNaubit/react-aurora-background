export interface IAnimationLoop {
	start(): void;
	stop(): void;
	setFps(fps: number): void;
	/** Whether the loop is running. */
	isRunning(): boolean;
	/** The animation time, in seconds. It only advances while the loop runs, so resuming does not jump. */
	time(): number;
}

interface ILoopEnvironment {
	requestFrame: (callback: (timestamp: number) => void) => number;
	cancelFrame: (handle: number) => void;
}

const browserEnvironment = (): ILoopEnvironment => ({
	requestFrame: (callback) => requestAnimationFrame(callback),
	cancelFrame: (handle) => cancelAnimationFrame(handle),
});

// A frame that comes this early (in milliseconds) still counts, so 60 Hz screens can reach 30 fps exactly
const FRAME_TOLERANCE_MS = 2;

/**
 * An animation loop capped at a number of frames per second.
 *
 * @param fps - The maximum number of frames per second.
 * @param onFrame - Called with the animation time, in seconds.
 */
export function createAnimationLoop(
	fps: number,
	onFrame: (time: number) => void,
	environment: ILoopEnvironment = browserEnvironment(),
): IAnimationLoop {
	let interval = 1000 / fps;
	let handle: number | null = null;
	let last: number | null = null;
	let elapsed = 0;

	const tick = (timestamp: number) => {
		handle = environment.requestFrame(tick);
		if (last === null) {
			last = timestamp;
			return;
		}
		const delta = timestamp - last;
		if (delta < interval - FRAME_TOLERANCE_MS) return;

		last = timestamp;
		elapsed += delta;
		onFrame(elapsed / 1000);
	};

	return {
		start() {
			if (handle !== null) return;
			last = null;
			handle = environment.requestFrame(tick);
		},
		stop() {
			if (handle !== null) environment.cancelFrame(handle);
			handle = null;
		},
		setFps(value) {
			interval = 1000 / value;
		},
		isRunning: () => handle !== null,
		time: () => elapsed / 1000,
	};
}
