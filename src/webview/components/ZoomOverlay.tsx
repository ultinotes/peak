import { ZoomIn, ZoomOut } from "../icons";
import { IconButton } from "./IconButton";
import { formatZoomLabel } from "../diagram/panZoom";

type Props = {
	idPrefix: "inline" | "modal";
	zoom: number;
	visible: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
};

export function ZoomOverlay({
	idPrefix,
	zoom,
	visible,
	onZoomIn,
	onZoomOut,
	onReset,
}: Props) {
	const overlayId = idPrefix === "inline" ? "inlineZoomOverlay" : "modalZoomOverlay";
	const resetId = idPrefix === "inline" ? "inlineZoomLabel" : "modalZoomReset";

	return (
		<div
			class={`diagram-zoom-overlay${visible ? "" : " hidden"}`}
			id={overlayId}
			onMouseDown={(event) => event.stopPropagation()}
		>
			<IconButton
				id={`${idPrefix}ZoomOut`}
				icon={ZoomOut}
				label="Zoom out"
				onClick={onZoomOut}
			/>
			<button
				class="zoom-label"
				id={resetId}
				type="button"
				title="Reset zoom"
				onClick={onReset}
			>
				{formatZoomLabel(zoom)}
			</button>
			<IconButton
				id={`${idPrefix}ZoomIn`}
				icon={ZoomIn}
				label="Zoom in"
				onClick={onZoomIn}
			/>
		</div>
	);
}
