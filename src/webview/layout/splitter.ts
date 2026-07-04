import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";
import { createDefaultSplitterDom, type SplitterDom } from "./splitterDom";
import {
	DEFAULT_SPLIT_RATIO,
	MIN_PANEL_PX,
	resolveSplitRatioFromPointer,
} from "./splitterLogic";

export { DEFAULT_SPLIT_RATIO, MIN_PANEL_PX };

export function applySplitSizes(
	placement: DefinitionPreviewPlacement,
	splitRatio: number,
	hasDefinition: boolean,
	dom: SplitterDom = createDefaultSplitterDom(),
): void {
	dom.applySplit(placement, splitRatio, hasDefinition);
}

export interface SplitterController {
	dispose(): void;
}

export function setupSplitter(
	options: {
		getPlacement: () => DefinitionPreviewPlacement;
		isDefinitionVisible: () => boolean;
		onSplitRatioCommit: (ratio: number) => void;
	},
	dom: SplitterDom = createDefaultSplitterDom(),
): SplitterController {
	let dragging = false;
	let dragRatio: number | undefined;

	const onSplitterMouseDown = (event: MouseEvent): void => {
		if (!options.isDefinitionVisible()) {
			return;
		}
		dragging = true;
		dragRatio = undefined;
		event.preventDefault();
	};

	const onMouseMove = (event: MouseEvent): void => {
		if (!dragging || !options.isDefinitionVisible()) {
			return;
		}
		const placement = options.getPlacement();
		const metrics = dom.readMetrics(placement);
		if (!metrics) {
			return;
		}
		const ratio = resolveSplitRatioFromPointer(
			placement,
			metrics.bounds,
			event.clientX,
			event.clientY,
		);
		dragRatio = ratio;
		dom.applySplit(placement, ratio, true);
	};

	const onMouseUp = (): void => {
		if (!dragging) {
			return;
		}
		dragging = false;
		if (dragRatio !== undefined) {
			options.onSplitRatioCommit(dragRatio);
		}
		dragRatio = undefined;
	};

	const disposeDrag = dom.onDrag({
		onMouseDown: onSplitterMouseDown,
		onMouseMove,
		onMouseUp,
	});

	return {
		dispose: disposeDrag,
	};
}
