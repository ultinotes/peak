import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";
import {
	computeDefinitionPanelPx,
	definitionPanelStyles,
	type LayoutBounds,
} from "./splitterLogic";

export interface SplitterDom {
	readMetrics(
		placement: DefinitionPreviewPlacement,
	): { bounds: LayoutBounds; splitterSize: number } | null;
	applySplit(
		placement: DefinitionPreviewPlacement,
		splitRatio: number,
		hasDefinition: boolean,
	): void;
	onDrag(handlers: {
		onMouseDown: (event: MouseEvent) => void;
		onMouseMove: (event: MouseEvent) => void;
		onMouseUp: () => void;
	}): () => void;
}

export function createDefaultSplitterDom(): SplitterDom {
	const main = document.getElementById("main");
	const definition = document.getElementById("definition");
	const splitter = document.getElementById("splitter");

	return {
		readMetrics(placement) {
			if (!main || !definition || !splitter) {
				return null;
			}
			const rect = main.getBoundingClientRect();
			const bounds: LayoutBounds = {
				width: rect.width,
				height: rect.height,
				right: rect.right,
				bottom: rect.bottom,
			};
			const splitterSize =
				placement === "right" ? splitter.offsetWidth : splitter.offsetHeight;
			return { bounds, splitterSize };
		},

		applySplit(placement, splitRatio, hasDefinition) {
			if (!main || !definition || !splitter) {
				return;
			}
			splitter.classList.toggle("visible", hasDefinition);
			if (!hasDefinition) {
				definition.style.flexBasis = "";
				definition.style.width = "";
				definition.style.height = "";
				return;
			}
			const metrics = this.readMetrics(placement);
			if (!metrics) {
				return;
			}
			const defSize = computeDefinitionPanelPx(
				placement,
				splitRatio,
				metrics.bounds,
				metrics.splitterSize,
			);
			const styles = definitionPanelStyles(placement, defSize, true);
			definition.style.flexBasis = styles.flexBasis;
			definition.style.width = styles.width;
			definition.style.height = styles.height;
		},

		onDrag(handlers) {
			if (!splitter) {
				return () => undefined;
			}
			splitter.addEventListener("mousedown", handlers.onMouseDown);
			window.addEventListener("mousemove", handlers.onMouseMove);
			window.addEventListener("mouseup", handlers.onMouseUp);
			return () => {
				splitter.removeEventListener("mousedown", handlers.onMouseDown);
				window.removeEventListener("mousemove", handlers.onMouseMove);
				window.removeEventListener("mouseup", handlers.onMouseUp);
			};
		},
	};
}
