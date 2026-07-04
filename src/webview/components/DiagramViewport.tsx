/**
 * Stable DOM ids for pan/zoom: diagramViewport, diagramContent, inlineZoomOverlay.
 */
import { useEffect, useRef, useState } from "preact/hooks";
import { createPanZoom, type PanZoomController } from "../diagram/panZoom";
import { renderMermaid } from "../diagram/mermaidHost";
import { ZoomOverlay } from "./ZoomOverlay";
import type { FlowchartDirection, PeakViewTab } from "../../shared/webviewProtocol";

type Props = {
	tab: PeakViewTab | undefined;
	direction: FlowchartDirection;
};

export function DiagramViewport({ tab, direction }: Props) {
	const panZoomRef = useRef<PanZoomController | null>(null);
	const [hasDiagram, setHasDiagram] = useState(false);
	const [inlineZoom, setInlineZoom] = useState(1);
	const renderGeneration = useRef(0);

	useEffect(() => {
		panZoomRef.current = createPanZoom("diagramViewport", "diagramContent", {
			wheelBehavior: "pan-or-zoom",
			onZoomChange: setInlineZoom,
		});
		return () => {
			panZoomRef.current?.stopPanning();
		};
	}, []);

	useEffect(() => {
		const gen = ++renderGeneration.current;
		const diagramEl = document.getElementById("diagramContent");
		if (!diagramEl) {
			return;
		}

		if (!tab?.mermaid.trim()) {
			diagramEl.innerHTML = "";
			diagramEl.classList.remove("has-diagram");
			setHasDiagram(false);
			panZoomRef.current?.reset();
			setInlineZoom(1);
			return;
		}

		void renderMermaid(
			diagramEl,
			tab.mermaid,
			tab.focusedNodeId,
			tab.id,
			direction,
		).then((ok) => {
			if (gen !== renderGeneration.current) {
				return;
			}
			diagramEl.classList.toggle("has-diagram", ok);
			setHasDiagram(ok);
			panZoomRef.current?.reset();
			setInlineZoom(1);
		});
	}, [tab?.id, tab?.mermaid, tab?.focusedNodeId, direction]);

	return (
		<div id="diagramViewport">
			<ZoomOverlay
				idPrefix="inline"
				zoom={inlineZoom}
				visible={hasDiagram}
				onZoomIn={() => panZoomRef.current?.zoomIn()}
				onZoomOut={() => panZoomRef.current?.zoomOut()}
				onReset={() => panZoomRef.current?.reset()}
			/>
			<div id="diagramContent" />
		</div>
	);
}
