import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";

export const MIN_PANEL_PX = 120;
export const DEFAULT_SPLIT_RATIO = 0.5;

export interface LayoutBounds {
	width: number;
	height: number;
	right: number;
	bottom: number;
}

export interface DefinitionPanelStyle {
	flexBasis: string;
	width: string;
	height: string;
}

export function clampSplitRatio(ratio: number, total: number): number {
	const minRatio = MIN_PANEL_PX / total;
	return Math.max(minRatio, Math.min(1 - minRatio, ratio));
}

export function splitRatioFromPointer(
	placement: DefinitionPreviewPlacement,
	bounds: LayoutBounds,
	clientX: number,
	clientY: number,
): number {
	return placement === "right"
		? (bounds.right - clientX) / bounds.width
		: (bounds.bottom - clientY) / bounds.height;
}

export function resolveSplitRatioFromPointer(
	placement: DefinitionPreviewPlacement,
	bounds: LayoutBounds,
	clientX: number,
	clientY: number,
): number {
	const total = placement === "right" ? bounds.width : bounds.height;
	return clampSplitRatio(
		splitRatioFromPointer(placement, bounds, clientX, clientY),
		total,
	);
}

export function computeDefinitionPanelPx(
	placement: DefinitionPreviewPlacement,
	splitRatio: number,
	bounds: Pick<LayoutBounds, "width" | "height">,
	splitterSize: number,
): number {
	const total = placement === "right" ? bounds.width : bounds.height;
	const requested = total * splitRatio;
	const maxDef = total - MIN_PANEL_PX - splitterSize;
	return Math.max(MIN_PANEL_PX, Math.min(maxDef, requested));
}

export function definitionPanelStyles(
	placement: DefinitionPreviewPlacement,
	defSizePx: number,
	hasDefinition: boolean,
): DefinitionPanelStyle {
	if (!hasDefinition) {
		return { flexBasis: "", width: "", height: "" };
	}
	const px = `${defSizePx}px`;
	if (placement === "right") {
		return { flexBasis: px, width: px, height: "" };
	}
	return { flexBasis: px, width: "", height: px };
}
