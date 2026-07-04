import {
	ArrowDown,
	ArrowRight,
	Copy,
	Maximize2,
	PanelBottom,
	PanelRight,
} from "../icons";
import { IconButton } from "./IconButton";
import { CursorBreadcrumb } from "./CursorBreadcrumb";
import type {
	CursorContext,
	DefinitionPreviewPlacement,
	FlowchartDirection,
} from "../../shared/webviewProtocol";

type Props = {
	activeTabId: string;
	hasDiagram: boolean;
	diagramDirection: FlowchartDirection;
	definitionPlacement: DefinitionPreviewPlacement;
	cursorContext?: CursorContext;
	onCopy: () => void;
	onFlipLayout: () => void;
	onFlipDirection: () => void;
	onExpand: () => void;
};

export function ActionBar({
	activeTabId,
	hasDiagram,
	diagramDirection,
	definitionPlacement,
	cursorContext,
	onCopy,
	onFlipLayout,
	onFlipDirection,
	onExpand,
}: Props) {
	const onDefinition = activeTabId === "definition";

	return (
		<div class="action-bar">
			<CursorBreadcrumb context={cursorContext} />
			<div class="action-bar-actions">
				<IconButton
					id="flipLayoutBtn"
					icon={definitionPlacement === "right" ? PanelBottom : PanelRight}
					label={
						definitionPlacement === "right"
							? "Move definition preview below diagram"
							: "Move definition preview beside diagram"
					}
					hidden={!onDefinition}
					onClick={onFlipLayout}
				/>
				<IconButton
					id="directionBtn"
					icon={diagramDirection === "TD" ? ArrowRight : ArrowDown}
					label={
						diagramDirection === "TD"
							? "Switch diagram to left-right layout"
							: "Switch diagram to top-down layout"
					}
					hidden={!hasDiagram}
					onClick={onFlipDirection}
				/>
				<IconButton
					id="expandBtn"
					icon={Maximize2}
					label="Expand diagram"
					hidden={!hasDiagram}
					disabled={!hasDiagram}
					onClick={onExpand}
				/>
				<IconButton
					id="copyBtn"
					className="copy-btn"
					icon={Copy}
					label="Copy diagram code"
					onClick={onCopy}
				/>
			</div>
		</div>
	);
}
