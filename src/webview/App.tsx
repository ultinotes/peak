import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { TabBar } from "./components/TabBar";
import { ActionBar } from "./components/ActionBar";
import { DiagramViewport } from "./components/DiagramViewport";
import { DefinitionPanel } from "./components/DefinitionPanel";
import { DiagramModal } from "./components/DiagramModal";
import {
	applySplitSizes,
	DEFAULT_SPLIT_RATIO,
	setupSplitter,
} from "./layout/splitter";
import { applyFlowchartDirection } from "./diagram/mermaidHost";
import { getWebviewState, persistWebviewState, vscode } from "./vscodeApi";
import {
	isWebviewUpdateMessage,
	type CursorContext,
	type DefinitionPreviewPlacement,
	type FlowchartDirection,
	type PeakViewTab,
} from "../shared/webviewProtocol";

export function App() {
	const saved = getWebviewState();
	const [tabs, setTabs] = useState<PeakViewTab[]>([]);
	const [activeTabId, setActiveTabId] = useState("");
	const [cursorContext, setCursorContext] = useState<CursorContext | undefined>();
	const [definitionPlacement, setDefinitionPlacement] =
		useState<DefinitionPreviewPlacement>(
			saved?.definitionPreviewPlacement ?? "right",
		);
	const [splitRatio, setSplitRatio] = useState(
		saved?.splitRatio ?? DEFAULT_SPLIT_RATIO,
	);
	const [diagramDirection, setDiagramDirection] =
		useState<FlowchartDirection>("TD");
	const [modalOpen, setModalOpen] = useState(false);

	const activeTab = useMemo(
		() => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
		[tabs, activeTabId],
	);

	const hasDiagram = Boolean(activeTab?.mermaid.trim());
	const definitionVisible = Boolean(activeTab?.definitionSnippet);

	const persistState = useCallback(() => {
		persistWebviewState({ splitRatio, definitionPreviewPlacement: definitionPlacement });
	}, [splitRatio, definitionPlacement]);

	useEffect(() => {
		const controller = setupSplitter({
			getPlacement: () => definitionPlacement,
			getSplitRatio: () => splitRatio,
			setSplitRatio,
			isDefinitionVisible: () => definitionVisible,
			onPersist: persistState,
		});
		return () => controller.dispose();
	}, [definitionPlacement, splitRatio, definitionVisible, persistState]);

	useEffect(() => {
		applySplitSizes(definitionPlacement, splitRatio, definitionVisible);
	}, [definitionPlacement, splitRatio, definitionVisible]);

	useEffect(() => {
		const onMessage = (event: MessageEvent): void => {
			const msg = event.data as unknown;
			if (!isWebviewUpdateMessage(msg)) {
				return;
			}
			setActiveTabId(msg.activeTab);
			setCursorContext(msg.cursorContext);
			if (
				msg.definitionPreviewPlacement &&
				!getWebviewState()?.definitionPreviewPlacement
			) {
				setDefinitionPlacement(msg.definitionPreviewPlacement);
			}
			setTabs(() => {
				const next = msg.tabs.map((t) => ({ ...t }));
				const tab = next.find((t) => t.id === msg.activeTab) ?? next[0];
				if (tab) {
					if (msg.definitionSnippet !== undefined) {
						tab.definitionSnippet = msg.definitionSnippet;
					}
					if (msg.definitionLocation !== undefined) {
						tab.definitionLocation = msg.definitionLocation;
					}
					if (msg.definitionSnippetHighlights !== undefined) {
						tab.definitionSnippetHighlights = msg.definitionSnippetHighlights;
					}
				}
				return next;
			});
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	const handleTabSelect = (id: string): void => {
		setActiveTabId(id);
	};

	const handleFlipLayout = (): void => {
		setDefinitionPlacement((p) => {
			const next = p === "right" ? "bottom" : "right";
			persistWebviewState({
				splitRatio,
				definitionPreviewPlacement: next,
			});
			return next;
		});
	};

	const handleFlipDirection = (): void => {
		setDiagramDirection((d) => (d === "TD" ? "LR" : "TD"));
	};

	const handleCopy = (): void => {
		const mermaid = activeTab?.mermaid
			? applyFlowchartDirection(activeTab.mermaid, diagramDirection)
			: "";
		vscode.postMessage({ type: "copy", mermaid });
	};

	const handleExpand = (): void => {
		if (hasDiagram) {
			setModalOpen(true);
		}
	};

	const handleModalClose = (): void => {
		setModalOpen(false);
	};

	return (
		<>
			<TabBar tabs={tabs} activeTabId={activeTabId} onSelect={handleTabSelect} />
			<ActionBar
				activeTabId={activeTabId}
				hasDiagram={hasDiagram}
				diagramDirection={diagramDirection}
				definitionPlacement={definitionPlacement}
				cursorContext={cursorContext}
				onCopy={handleCopy}
				onFlipLayout={handleFlipLayout}
				onFlipDirection={handleFlipDirection}
				onExpand={handleExpand}
			/>
			<div
				id="main"
				class={`main ${definitionPlacement === "bottom" ? "layout-bottom" : "layout-right"}`}
			>
				<DiagramViewport tab={activeTab} direction={diagramDirection} />
				<div id="splitter" class={definitionVisible ? "visible" : ""} aria-hidden="true" />
				<DefinitionPanel tab={activeTab} visible={definitionVisible} />
			</div>
			<DiagramModal
				open={modalOpen}
				tab={activeTab}
				direction={diagramDirection}
				onClose={handleModalClose}
			/>
		</>
	);
}
