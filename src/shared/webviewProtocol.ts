import type { HighlightSpan } from "../domain/symbol";

export type DefinitionPreviewPlacement = "bottom" | "right";

export type FlowchartDirection = "TD" | "LR";

export interface CursorContext {
	fileSegments: string[];
	symbolSegments: string[];
}

export interface PeakViewTab {
	id: string;
	label: string;
	mermaid: string;
	focusedNodeId?: string;
	definitionSnippet?: string;
	definitionLocation?: string;
	definitionSnippetHighlights?: HighlightSpan[];
}

export interface WebviewUpdateMessage {
	type: "update";
	activeTab: string;
	tabs: PeakViewTab[];
	cursorContext?: CursorContext;
	definitionPreviewPlacement?: DefinitionPreviewPlacement;
	definitionSnippet?: string;
	definitionLocation?: string;
	definitionSnippetHighlights?: HighlightSpan[];
}

export interface WebviewState {
	splitRatio?: number;
	definitionPreviewPlacement?: DefinitionPreviewPlacement;
}

export function isWebviewUpdateMessage(
	msg: unknown,
): msg is WebviewUpdateMessage {
	if (typeof msg !== "object" || msg === null) {
		return false;
	}
	const m = msg as Record<string, unknown>;
	return (
		m.type === "update" &&
		typeof m.activeTab === "string" &&
		Array.isArray(m.tabs)
	);
}
