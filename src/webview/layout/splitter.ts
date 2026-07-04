import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";

export const MIN_PANEL_PX = 120;
export const DEFAULT_SPLIT_RATIO = 0.5;

function clampSplitRatio(ratio: number, total: number): number {
	const minRatio = MIN_PANEL_PX / total;
	return Math.max(minRatio, Math.min(1 - minRatio, ratio));
}

export function applySplitSizes(
	placement: DefinitionPreviewPlacement,
	splitRatio: number,
	hasDefinition: boolean,
): void {
	const main = document.getElementById("main");
	const definition = document.getElementById("definition");
	const splitter = document.getElementById("splitter");
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

	const mainRect = main.getBoundingClientRect();
	const isRight = placement === "right";
	const total = isRight ? mainRect.width : mainRect.height;
	const splitterSize = isRight ? splitter.offsetWidth : splitter.offsetHeight;
	const defSize = Math.max(
		MIN_PANEL_PX,
		Math.min(total - MIN_PANEL_PX - splitterSize, total * splitRatio),
	);
	if (isRight) {
		definition.style.flexBasis = `${defSize}px`;
		definition.style.width = `${defSize}px`;
		definition.style.height = "";
	} else {
		definition.style.flexBasis = `${defSize}px`;
		definition.style.height = `${defSize}px`;
		definition.style.width = "";
	}
}

export interface SplitterController {
	dispose(): void;
}

export function setupSplitter(options: {
	getPlacement: () => DefinitionPreviewPlacement;
	isDefinitionVisible: () => boolean;
	onSplitRatioCommit: (ratio: number) => void;
}): SplitterController {
	const splitter = document.getElementById("splitter");
	const main = document.getElementById("main");
	if (!splitter || !main) {
		return { dispose: () => undefined };
	}

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
		const mainRect = main.getBoundingClientRect();
		const isRight = options.getPlacement() === "right";
		const total = isRight ? mainRect.width : mainRect.height;
		const rawRatio = isRight
			? (mainRect.right - event.clientX) / mainRect.width
			: (mainRect.bottom - event.clientY) / mainRect.height;
		const ratio = clampSplitRatio(rawRatio, total);
		dragRatio = ratio;
		applySplitSizes(options.getPlacement(), ratio, true);
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

	splitter.addEventListener("mousedown", onSplitterMouseDown);
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);

	return {
		dispose: () => {
			splitter.removeEventListener("mousedown", onSplitterMouseDown);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		},
	};
}
