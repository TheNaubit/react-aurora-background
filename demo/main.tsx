import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Demo } from "./Demo.js";

const container = document.getElementById("root");
if (container) {
	createRoot(container).render(
		<StrictMode>
			<Demo />
		</StrictMode>,
	);
}
