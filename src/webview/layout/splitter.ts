import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";

export const MIN_PANEL_PX = 120;
export const DEFAULT_SPLIT_RATIO = 0.5;

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
	getSplitRatio: () => number;
	setSplitRatio: (ratio: number) => void;
	isDefinitionVisible: () => boolean;
	onPersist: () => void;
}): SplitterController {
	const splitter = document.getElementById("splitter");
	const main = document.getElementById("main");
	if (!splitter || !main) {
		return { dispose: () => undefined };
	}

	let dragging = false;

	const onSplitterMouseDown = (event: MouseEvent): void => {
		if (!options.isDefinitionVisible()) {
			return;
		}
		dragging = true;
		event.preventDefault();
	};

	const onMouseMove = (event: MouseEvent): void => {
		if (!dragging) {
			return;
		}
		const mainRect = main.getBoundingClientRect();
		const isRight = options.getPlacement() === "right";
		if (isRight) {
			const defWidth = mainRect.right - event.clientX;
			const ratio = defWidth / mainRect.width;
			options.setSplitRatio(
				Math.max(
					MIN_PANEL_PX / mainRect.width,
					Math.min(1 - MIN_PANEL_PX / mainRect.width, ratio),
				),
			);
		} else {
			const defHeight = mainRect.bottom - event.clientY;
			const ratio = defHeight / mainRect.height;
			options.setSplitRatio(
			 Math.max(
					MIN_PANEL_PX / mainRect.height,
					Math.min(1 - MIN_PANEL_PX / mainRect.height, ratio),
				),
			);
		}
		applySplitSizes(
			options.getPlacement(),
			options.getSplitRatio(),
			options.isDefinitionVisible(),
		);
	};

	const onMouseUp = (): void => {
		if (!dragging) {
			return;
		}
		dragging = false;
		options.onPersist();
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
