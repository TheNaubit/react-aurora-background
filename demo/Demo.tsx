import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
	AuroraBackgroundProvider,
	type Color,
	type NumBubbles,
} from "../src/index.js";

const DEFAULT_COLORS: Array<Color> = [
	"#fc466b",
	"#3f5efb",
	"#f8ff00",
	"#3ad59f",
];

function detectRenderer(): string {
	const canvas = document.createElement("canvas");
	if (canvas.getContext("webgl2")) return "WebGL 2";
	if (canvas.getContext("webgl")) return "WebGL 1";
	return "CSS fallback (no WebGL)";
}

const styles = {
	page: {
		display: "grid",
		// minmax(0, ...) lets the panel shrink below its content on small screens
		gridTemplateColumns: "minmax(0, 440px)",
		justifyContent: "center",
		alignContent: "center",
		minHeight: "100%",
		padding: "24px 16px",
		boxSizing: "border-box",
	},
	panel: {
		width: "100%",
		maxWidth: 440,
		padding: 24,
		borderRadius: 20,
		background: "rgba(8, 12, 40, 0.42)",
		border: "1px solid rgba(255, 255, 255, 0.18)",
		boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
		boxSizing: "border-box",
	},
	title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: -0.5 },
	lead: { margin: "8px 0 20px", opacity: 0.85, lineHeight: 1.5 },
	row: {
		display: "grid",
		gridTemplateColumns: "118px 1fr 44px",
		alignItems: "center",
		gap: 10,
		margin: "10px 0",
		fontSize: 14,
	},
	value: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
	colors: { display: "flex", gap: 8 },
	colorInput: {
		width: 40,
		height: 32,
		padding: 0,
		border: "1px solid rgba(255, 255, 255, 0.4)",
		borderRadius: 8,
		background: "transparent",
		cursor: "pointer",
	},
	footer: {
		display: "flex",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 20,
		fontSize: 13,
		opacity: 0.85,
	},
	link: { color: "#fff" },
	code: {
		display: "block",
		marginTop: 16,
		padding: 12,
		borderRadius: 10,
		background: "rgba(0, 0, 0, 0.3)",
		fontSize: 12,
		overflowX: "auto",
		whiteSpace: "pre",
	},
} satisfies Record<string, CSSProperties>;

function Row({
	label,
	value,
	children,
}: {
	label: string;
	value?: string;
	children: ReactNode;
}) {
	return (
		<label style={styles.row}>
			<span>{label}</span>
			{children}
			<span style={styles.value}>{value}</span>
		</label>
	);
}

export function Demo() {
	const [colors, setColors] = useState(DEFAULT_COLORS);
	const [numBubbles, setNumBubbles] = useState<NumBubbles>(4);
	const [animDuration, setAnimDuration] = useState(20);
	const [blur, setBlur] = useState(10);
	const [fps, setFps] = useState(30);
	const [useRandomness, setUseRandomness] = useState(true);
	const [paused, setPaused] = useState(false);
	const renderer = useMemo(detectRenderer, []);

	const snippet = `<AuroraBackgroundProvider
  colors={${JSON.stringify(colors)}}
  numBubbles={${numBubbles}}
  animDuration={${animDuration}}
  blurAmount="${blur}vw"
  fps={${fps}}${useRandomness ? "\n  useRandomness" : ""}${paused ? "\n  paused" : ""}
>`;

	return (
		<AuroraBackgroundProvider
			colors={colors}
			numBubbles={numBubbles}
			animDuration={animDuration}
			blurAmount={`${blur}vw`}
			fps={fps}
			useRandomness={useRandomness}
			paused={paused}
		>
			<main style={styles.page}>
				<section style={styles.panel}>
					<h1 style={styles.title}>React Aurora Background</h1>
					<p style={styles.lead}>
						One tiny WebGL shader, rendered at a low resolution and paused when
						you can not see it. Change anything below.
					</p>

					<Row label="Colors">
						<div style={styles.colors}>
							{colors.map((color, index) => (
								<input
									// biome-ignore lint/suspicious/noArrayIndexKey: the four color slots never move
									key={index}
									type="color"
									aria-label={`Color ${index + 1}`}
									value={color}
									style={styles.colorInput}
									onChange={(event) =>
										setColors(
											colors.map((current, position) =>
												position === index ? event.target.value : current,
											),
										)
									}
								/>
							))}
						</div>
					</Row>
					<Row label="Bubbles" value={String(numBubbles)}>
						<input
							type="range"
							min={2}
							max={9}
							value={numBubbles}
							onChange={(event) =>
								setNumBubbles(Number(event.target.value) as NumBubbles)
							}
						/>
					</Row>
					<Row label="Cycle duration" value={`${animDuration}s`}>
						<input
							type="range"
							min={2}
							max={60}
							value={animDuration}
							onChange={(event) => setAnimDuration(Number(event.target.value))}
						/>
					</Row>
					<Row label="Blur" value={`${blur}vw`}>
						<input
							type="range"
							min={0}
							max={30}
							value={blur}
							onChange={(event) => setBlur(Number(event.target.value))}
						/>
					</Row>
					<Row label="Frame rate" value={`${fps}`}>
						<input
							type="range"
							min={1}
							max={60}
							value={fps}
							onChange={(event) => setFps(Number(event.target.value))}
						/>
					</Row>
					<Row label="Randomness">
						<input
							type="checkbox"
							checked={useRandomness}
							onChange={(event) => setUseRandomness(event.target.checked)}
						/>
					</Row>
					<Row label="Paused">
						<input
							type="checkbox"
							checked={paused}
							onChange={(event) => setPaused(event.target.checked)}
						/>
					</Row>

					<code style={styles.code}>{snippet}</code>

					<div style={styles.footer}>
						<span>Renderer: {renderer}</span>
						<a
							style={styles.link}
							href="https://github.com/TheNaubit/react-aurora-background"
						>
							GitHub
						</a>
						<a
							style={styles.link}
							href="https://www.npmjs.com/package/@nauverse/react-aurora-background"
						>
							npm
						</a>
					</div>
				</section>
			</main>
		</AuroraBackgroundProvider>
	);
}
