/**
 * Stable DOM ids: diagramModal, diagramModalViewport, diagramModalContent, modalZoomOverlay.
 */
import { useEffect, useRef, useState } from "preact/hooks";
import { X } from "../icons";
import { IconButton } from "./IconButton";
import { ZoomOverlay } from "./ZoomOverlay";
import { createPanZoom, type PanZoomController } from "../diagram/panZoom";
import {
	clearModalContent,
	cloneSvgToModal,
	renderMermaid,
} from "../diagram/mermaidHost";
import { vscode } from "../vscodeApi";
import type { FlowchartDirection, PeakViewTab } from "../../shared/webviewProtocol";

type Props = {
	open: boolean;
	tab: PeakViewTab | undefined;
	direction: FlowchartDirection;
	onClose: () => void;
};

export function DiagramModal({ open, tab, direction, onClose }: Props) {
	const panZoomRef = useRef<PanZoomController | null>(null);
	const [modalZoom, setModalZoom] = useState(1);
	const openedRef = useRef(false);

	useEffect(() => {
		panZoomRef.current = createPanZoom(
			"diagramModalViewport",
			"diagramModalContent",
			{
				isActive: () => open,
				onZoomChange: setModalZoom,
				wheelBehavior: "zoom",
			},
		);
		return () => {
			panZoomRef.current?.stopPanning();
		};
	}, []);

	useEffect(() => {
		if (!open) {
			openedRef.current = false;
			panZoomRef.current?.stopPanning();
			clearModalContent();
			return;
		}

		panZoomRef.current?.reset();
		setModalZoom(1);

		const populate = async (): Promise<void> => {
			if (cloneSvgToModal()) {
				if (!openedRef.current) {
					openedRef.current = true;
					vscode.postMessage({ type: "modalOpen" });
				}
				return;
			}
			const content = document.getElementById("diagramModalContent");
			if (!content) {
				return;
			}
			if (!tab?.mermaid.trim()) {
				content.innerHTML = `<p class="error">No diagram to display.</p>`;
				return;
			}
			await renderMermaid(
				content,
				tab.mermaid,
				tab.focusedNodeId,
				`${tab.id}-modal`,
				direction,
				true,
			);
			if (!openedRef.current) {
				openedRef.current = true;
				vscode.postMessage({ type: "modalOpen" });
			}
		};

		void populate();
	}, [open, tab?.id, tab?.mermaid, tab?.focusedNodeId, direction]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	const handleClose = (): void => {
		panZoomRef.current?.stopPanning();
		clearModalContent();
		vscode.postMessage({ type: "modalClose" });
		onClose();
	};

	return (
		<div
			id="diagramModal"
			class={`diagram-modal${open ? " open" : ""}`}
			role="dialog"
			aria-modal="true"
			aria-label="Diagram viewer"
		>
			<div
				class="diagram-modal-backdrop"
				id="diagramModalBackdrop"
				onClick={handleClose}
			/>
			<div class="diagram-modal-header">
				<span class="spacer" />
				<IconButton
					id="modalCloseBtn"
					icon={X}
					label="Close"
					onClick={handleClose}
				/>
			</div>
			<div class="diagram-modal-viewport" id="diagramModalViewport">
				<ZoomOverlay
					idPrefix="modal"
					zoom={modalZoom}
					visible={open}
					onZoomIn={() => panZoomRef.current?.zoomIn()}
					onZoomOut={() => panZoomRef.current?.zoomOut()}
					onReset={() => panZoomRef.current?.reset()}
				/>
				<div class="diagram-modal-content" id="diagramModalContent" />
			</div>
		</div>
	);
}
