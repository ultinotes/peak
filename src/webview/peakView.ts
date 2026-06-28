import mermaid from "mermaid";
import {
	ArrowDown,
	ArrowRight,
	Copy,
	Maximize2,
	PanelBottom,
	PanelRight,
	renderIcon,
	setButtonIcon,
	TAB_ICONS,
	X,
	ZoomIn,
	ZoomOut,
} from "./icons";

interface HighlightSpan {
	start: number;
	length: number;
	tokenType: string;
	modifiers?: string[];
}

interface CursorContext {
	fileSegments: string[];
	symbolSegments: string[];
}

interface PeakViewTab {
	id: string;
	label: string;
	mermaid: string;
	focusedNodeId?: string;
	definitionSnippet?: string;
	definitionLocation?: string;
	definitionSnippetHighlights?: HighlightSpan[];
}

interface UpdateMessage {
	type: "update";
	activeTab: string;
	tabs: PeakViewTab[];
	cursorContext?: CursorContext;
	definitionPreviewPlacement?: "right" | "bottom";
	definitionSnippet?: string;
	definitionLocation?: string;
	definitionSnippetHighlights?: HighlightSpan[];
}

interface WebviewState {
	splitRatio?: number;
	definitionPreviewPlacement?: "right" | "bottom";
}

type FlowchartDirection = "TD" | "LR";

declare function acquireVsCodeApi(): {
	postMessage(message: unknown): void;
	getState(): WebviewState | undefined;
	setState(state: WebviewState): void;
};

const vscode = acquireVsCodeApi();

const MIN_PANEL_PX = 120;
const DEFAULT_SPLIT_RATIO = 0.5;
const MIN_ZOOM = 0.05;
const WHEEL_ZOOM_FACTOR = 1.12;

let tabs: PeakViewTab[] = [];
let activeTabId = "";
let definitionPreviewPlacement: "right" | "bottom" =
	vscode.getState()?.definitionPreviewPlacement ?? "right";
let splitRatio = vscode.getState()?.splitRatio ?? DEFAULT_SPLIT_RATIO;
let diagramDirection: FlowchartDirection = "TD";
let dragging = false;
let modalOpen = false;
let renderCounter = 0;

interface PanZoomState {
	zoom: number;
	panX: number;
	panY: number;
	panning: boolean;
	panStartX: number;
	panStartY: number;
	panOriginX: number;
	panOriginY: number;
}

interface PanZoomController {
	state: PanZoomState;
	reset(): void;
	apply(): void;
	stopPanning(): void;
	zoomIn(): void;
	zoomOut(): void;
}

/** Assumption: inline scroll pans; ctrl/meta+scroll zooms; modal scroll always zooms. */
type WheelBehavior = "zoom" | "pan-or-zoom";

function formatZoomLabel(zoom: number): string {
	return `${Math.round(zoom * 100)}%`;
}

function applyZoom(state: PanZoomState, factor: number, apply: () => void): void {
	const prevZoom = state.zoom;
	state.zoom = Math.max(MIN_ZOOM, state.zoom * factor);
	const scale = state.zoom / prevZoom;
	state.panX *= scale;
	state.panY *= scale;
	apply();
}

function createPanZoom(
	viewportId: string,
	contentId: string,
	options?: {
		isActive?: () => boolean;
		onZoomChange?: (zoom: number) => void;
		wheelBehavior?: WheelBehavior;
	},
): PanZoomController {
	const wheelBehavior = options?.wheelBehavior ?? "zoom";
	const state: PanZoomState = {
		zoom: 1,
		panX: 0,
		panY: 0,
		panning: false,
		panStartX: 0,
		panStartY: 0,
		panOriginX: 0,
		panOriginY: 0,
	};

	const apply = (): void => {
		const content = document.getElementById(contentId);
		if (!content) {
			return;
		}
		content.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
		options?.onZoomChange?.(state.zoom);
	};

	const reset = (): void => {
		state.zoom = 1;
		state.panX = 0;
		state.panY = 0;
		apply();
	};

	const zoomIn = (): void => {
		applyZoom(state, WHEEL_ZOOM_FACTOR, apply);
	};

	const zoomOut = (): void => {
		applyZoom(state, 1 / WHEEL_ZOOM_FACTOR, apply);
	};

	const stopPanning = (): void => {
		if (!state.panning) {
			return;
		}
		state.panning = false;
		document.getElementById(viewportId)?.classList.remove("panning");
	};

	const viewport = document.getElementById(viewportId);
	viewport?.addEventListener(
		"wheel",
		(event) => {
			if (options?.isActive && !options.isActive()) {
				return;
			}
			event.preventDefault();
			if (
				wheelBehavior === "pan-or-zoom" &&
				!event.ctrlKey &&
				!event.metaKey
			) {
				state.panX -= event.deltaX;
				state.panY -= event.deltaY;
				apply();
				return;
			}
			const prevZoom = state.zoom;
			state.zoom =
				event.deltaY > 0
					? Math.max(MIN_ZOOM, state.zoom / WHEEL_ZOOM_FACTOR)
					: state.zoom * WHEEL_ZOOM_FACTOR;
			const scale = state.zoom / prevZoom;
			state.panX *= scale;
			state.panY *= scale;
			apply();
		},
		{ passive: false },
	);

	viewport?.addEventListener("mousedown", (event) => {
		if (options?.isActive && !options.isActive()) {
			return;
		}
		if (event.button !== 0) {
			return;
		}
		state.panning = true;
		state.panStartX = event.clientX;
		state.panStartY = event.clientY;
		state.panOriginX = state.panX;
		state.panOriginY = state.panY;
		viewport.classList.add("panning");
		event.preventDefault();
	});

	window.addEventListener("mousemove", (event) => {
		if (!state.panning) {
			return;
		}
		state.panX = state.panOriginX + (event.clientX - state.panStartX);
		state.panY = state.panOriginY + (event.clientY - state.panStartY);
		apply();
	});

	window.addEventListener("mouseup", () => {
		stopPanning();
	});

	return { state, reset, apply, stopPanning, zoomIn, zoomOut };
}

let inlinePanZoom: PanZoomController;
let modalPanZoom: PanZoomController;

mermaid.initialize({
	startOnLoad: false,
	theme: "dark",
	securityLevel: "strict",
	flowchart: { useMaxWidth: true, curve: "linear" },
});

function isUpdateMessage(msg: unknown): msg is UpdateMessage {
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

function applyFlowchartDirection(source: string, dir: FlowchartDirection): string {
	return source.replace(/^flowchart\s+(TD|LR)/i, `flowchart ${dir}`);
}

function activeTab(): PeakViewTab | undefined {
	return tabs.find((t) => t.id === activeTabId) ?? tabs[0];
}

function activeTabHasDiagram(): boolean {
	return Boolean(activeTab()?.mermaid.trim());
}

function tokenClassName(tokenType: string): string {
	return `token-${tokenType.replace(/[^\w-]/g, "-")}`;
}

function renderHighlightedSnippet(
	body: HTMLElement,
	snippet: string,
	highlights?: HighlightSpan[],
): void {
	body.replaceChildren();
	if (!highlights?.length) {
		body.textContent = snippet;
		return;
	}
	const sorted = [...highlights].sort((a, b) => a.start - b.start);
	let cursor = 0;
	for (const span of sorted) {
		if (span.start < cursor) {
			continue;
		}
		if (span.start > cursor) {
			body.appendChild(
				document.createTextNode(snippet.slice(cursor, span.start)),
			);
		}
		const el = document.createElement("span");
		el.className = tokenClassName(span.tokenType);
		for (const mod of span.modifiers ?? []) {
			el.classList.add(`token-mod-${mod.replace(/[^\w-]/g, "-")}`);
		}
		el.textContent = snippet.slice(span.start, span.start + span.length);
		body.appendChild(el);
		cursor = span.start + span.length;
	}
	if (cursor < snippet.length) {
		body.appendChild(document.createTextNode(snippet.slice(cursor)));
	}
}

function applyLayout(): void {
	const main = document.getElementById("main");
	if (!main) {
		return;
	}
	main.classList.remove("layout-right", "layout-bottom");
	main.classList.add(
		definitionPreviewPlacement === "bottom" ? "layout-bottom" : "layout-right",
	);
	applySplitSizes();
}

function applySplitSizes(): void {
	const main = document.getElementById("main");
	const definition = document.getElementById("definition");
	const splitter = document.getElementById("splitter");
	if (!main || !definition || !splitter) {
		return;
	}
	const hasDefinition = definition.classList.contains("visible");
	splitter.classList.toggle("visible", hasDefinition);
	if (!hasDefinition) {
		definition.style.flexBasis = "";
		definition.style.width = "";
		definition.style.height = "";
		return;
	}

	const mainRect = main.getBoundingClientRect();
	const isRight = definitionPreviewPlacement === "right";
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

function setupSplitter(): void {
	const splitter = document.getElementById("splitter");
	const main = document.getElementById("main");
	if (!splitter || !main) {
		return;
	}

	splitter.addEventListener("mousedown", (event) => {
		if (!document.getElementById("definition")?.classList.contains("visible")) {
			return;
		}
		dragging = true;
		event.preventDefault();
	});

	window.addEventListener("mousemove", (event) => {
		if (!dragging) {
			return;
		}
		const mainRect = main.getBoundingClientRect();
		const isRight = definitionPreviewPlacement === "right";
		if (isRight) {
			const defWidth = mainRect.right - event.clientX;
			const ratio = defWidth / mainRect.width;
			splitRatio = Math.max(
				MIN_PANEL_PX / mainRect.width,
				Math.min(1 - MIN_PANEL_PX / mainRect.width, ratio),
			);
		} else {
			const defHeight = mainRect.bottom - event.clientY;
			const ratio = defHeight / mainRect.height;
			splitRatio = Math.max(
				MIN_PANEL_PX / mainRect.height,
				Math.min(1 - MIN_PANEL_PX / mainRect.height, ratio),
			);
		}
		applySplitSizes();
	});

	window.addEventListener("mouseup", () => {
		if (!dragging) {
			return;
		}
		dragging = false;
		vscode.setState({ splitRatio, definitionPreviewPlacement });
	});
}

function persistWebviewState(): void {
	vscode.setState({ splitRatio, definitionPreviewPlacement });
}

function updateToolbarButtons(): void {
	const flipBtn = document.getElementById("flipLayoutBtn");
	const directionBtn = document.getElementById("directionBtn");
	const expandBtn = document.getElementById("expandBtn");
	const hasDiagram = activeTabHasDiagram();

	if (flipBtn) {
		const onDefinition = activeTabId === "definition";
		flipBtn.classList.toggle("hidden", !onDefinition);
		if (onDefinition) {
			const label =
				definitionPreviewPlacement === "right"
					? "Move definition preview below diagram"
					: "Move definition preview beside diagram";
			setButtonIcon(
				flipBtn,
				definitionPreviewPlacement === "right" ? PanelBottom : PanelRight,
				label,
			);
		}
	}

	if (directionBtn) {
		directionBtn.classList.toggle("hidden", !hasDiagram);
		if (hasDiagram) {
			const label =
				diagramDirection === "TD"
					? "Switch diagram to left-right layout"
					: "Switch diagram to top-down layout";
			setButtonIcon(
				directionBtn,
				diagramDirection === "TD" ? ArrowRight : ArrowDown,
				label,
			);
		}
	}

	if (expandBtn instanceof HTMLButtonElement) {
		expandBtn.classList.toggle("hidden", !hasDiagram);
		expandBtn.disabled = !hasDiagram;
	}
}

function flipDefinitionLayout(): void {
	definitionPreviewPlacement =
		definitionPreviewPlacement === "right" ? "bottom" : "right";
	applyLayout();
	updateToolbarButtons();
	persistWebviewState();
}

function flipDiagramDirection(): void {
	diagramDirection = diagramDirection === "TD" ? "LR" : "TD";
	void refreshDiagrams();
}

function findNodeGroup(
	svg: SVGSVGElement,
	focusedNodeId: string,
): SVGGElement | undefined {
	const direct = svg.querySelector(`#${CSS.escape(focusedNodeId)}`);
	if (direct) {
		return direct as SVGGElement;
	}
	for (const group of svg.querySelectorAll("g.node, g.nodes")) {
		const id = group.getAttribute("id") ?? "";
		if (
			id === focusedNodeId ||
			id.endsWith(`-${focusedNodeId}`) ||
			id.includes(`${focusedNodeId}-`)
		) {
			return group as SVGGElement;
		}
	}
	return undefined;
}

function emphasizeFocusedNode(
	diagramEl: HTMLElement,
	focusedNodeId: string | undefined,
): void {
	if (!focusedNodeId) {
		return;
	}
	const svg = diagramEl.querySelector("svg");
	if (!svg) {
		return;
	}

	const nodeGroup = findNodeGroup(svg, focusedNodeId);
	if (!nodeGroup) {
		return;
	}

	const shape = nodeGroup.querySelector("rect, path, polygon, circle, ellipse");
	if (!shape) {
		return;
	}

	const existing = nodeGroup.querySelector(".peak-focus-ring");
	existing?.remove();

	let bbox: DOMRect;
	try {
		bbox = (shape as SVGGraphicsElement).getBBox();
	} catch {
		return;
	}

	const pad = 4;
	const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	ring.setAttribute("class", "peak-focus-ring");
	ring.setAttribute("x", String(bbox.x - pad));
	ring.setAttribute("y", String(bbox.y - pad));
	ring.setAttribute("width", String(bbox.width + pad * 2));
	ring.setAttribute("height", String(bbox.height + pad * 2));
	ring.setAttribute("fill", "none");
	ring.setAttribute("stroke", "currentColor");
	ring.setAttribute("stroke-width", "2");
	ring.setAttribute("rx", "4");
	nodeGroup.insertBefore(ring, nodeGroup.firstChild);
}

async function renderMermaid(
	targetEl: HTMLElement,
	source: string,
	focusedNodeId: string | undefined,
	renderId: string,
	forModal = false,
): Promise<boolean> {
	if (!source.trim()) {
		targetEl.innerHTML = "";
		return false;
	}
	const directed = applyFlowchartDirection(source, diagramDirection);
	try {
		renderCounter += 1;
		const { svg } = await mermaid.render(
			`peak-${renderId}-${renderCounter}`,
			directed,
		);
		targetEl.innerHTML = svg;
		const rendered = targetEl.querySelector("svg") as SVGSVGElement | null;
		if (forModal && rendered) {
			normalizeModalSvg(rendered);
		}
		emphasizeFocusedNode(targetEl, focusedNodeId);
		return true;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		targetEl.innerHTML = `<p class="error">Mermaid render failed: ${message}</p><pre>${directed}</pre>`;
		return false;
	}
}

function normalizeModalSvg(
	svg: SVGSVGElement,
	fallbackWidth?: number,
	fallbackHeight?: number,
): void {
	svg.style.maxWidth = "none";
	svg.removeAttribute("style");

	let width = fallbackWidth ?? 0;
	let height = fallbackHeight ?? 0;

	const viewBox = svg.viewBox.baseVal;
	if (viewBox.width > 0 && viewBox.height > 0) {
		if (width <= 0) {
			width = viewBox.width;
		}
		if (height <= 0) {
			height = viewBox.height;
		}
		if (width > 0 && height <= 0) {
			height = (viewBox.height / viewBox.width) * width;
		}
		if (height > 0 && width <= 0) {
			width = (viewBox.width / viewBox.height) * height;
		}
	}

	if (width <= 0 || height <= 0) {
		try {
			const bbox = svg.getBBox();
			if (bbox.width > 0 && bbox.height > 0) {
				width = bbox.width;
				height = bbox.height;
			}
		} catch {
			// Assumption: getBBox needs laid-out SVG; viewBox fallback above is primary.
		}
	}

	if (width <= 0 || height <= 0) {
		width = 480;
		height = 360;
	}

	const viewport = document.getElementById("diagramModalViewport");
	if (viewport) {
		const maxW = Math.max(viewport.clientWidth - 48, 200);
		const maxH = Math.max(viewport.clientHeight - 48, 200);
		const fit = Math.min(maxW / width, maxH / height, 1);
		width *= fit;
		height *= fit;
	}

	const w = Math.round(width);
	const h = Math.round(height);
	svg.setAttribute("width", String(w));
	svg.setAttribute("height", String(h));
	svg.style.width = `${w}px`;
	svg.style.height = `${h}px`;

	const content = document.getElementById("diagramModalContent");
	if (content) {
		content.style.width = `${w}px`;
		content.style.minWidth = `${w}px`;
		content.style.height = `${h}px`;
	}
}

function cloneSvgToModal(): boolean {
	const content = document.getElementById("diagramModalContent");
	const source = document.querySelector(
		"#diagramContent svg",
	) as SVGSVGElement | undefined;
	if (!content || !source) {
		return false;
	}
	const rect = source.getBoundingClientRect();
	content.replaceChildren();
	const clone = source.cloneNode(true) as SVGSVGElement;
	content.appendChild(clone);
	normalizeModalSvg(clone, rect.width, rect.height);
	return true;
}

function clearModalContent(): void {
	const content = document.getElementById("diagramModalContent");
	if (!content) {
		return;
	}
	content.replaceChildren();
	content.style.width = "";
	content.style.minWidth = "";
	content.style.height = "";
	content.style.transform = "";
}

function resetModalTransform(): void {
	modalPanZoom.reset();
}

function updateModalZoomLabel(zoom: number): void {
	const resetBtn = document.getElementById("modalZoomReset");
	if (resetBtn) {
		resetBtn.textContent = formatZoomLabel(zoom);
	}
}

function updateInlineZoomLabel(zoom: number): void {
	const label = document.getElementById("inlineZoomLabel");
	if (label) {
		label.textContent = formatZoomLabel(zoom);
	}
}

function setInlineZoomOverlayVisible(visible: boolean): void {
	document
		.getElementById("inlineZoomOverlay")
		?.classList.toggle("hidden", !visible);
}

function setModalZoomOverlayVisible(visible: boolean): void {
	document
		.getElementById("modalZoomOverlay")
		?.classList.toggle("hidden", !visible);
}

async function populateModalDiagram(): Promise<void> {
	const content = document.getElementById("diagramModalContent");
	if (!content) {
		return;
	}
	if (cloneSvgToModal()) {
		return;
	}
	const tab = activeTab();
	if (!tab?.mermaid.trim()) {
		content.innerHTML = `<p class="error">No diagram to display.</p>`;
		return;
	}
	await renderMermaid(
		content,
		tab.mermaid,
		tab.focusedNodeId,
		`${tab.id}-modal`,
		true,
	);
}

function openDiagramModal(): void {
	if (!activeTabHasDiagram()) {
		return;
	}
	const modal = document.getElementById("diagramModal");
	if (!modal) {
		return;
	}
	modalOpen = true;
	modal.classList.add("open");
	setModalZoomOverlayVisible(true);
	resetModalTransform();
	void populateModalDiagram().then(() => {
		vscode.postMessage({ type: "modalOpen" });
	});
}

function closeDiagramModal(): void {
	const modal = document.getElementById("diagramModal");
	if (!modal || !modalOpen) {
		return;
	}
	modalOpen = false;
	modal.classList.remove("open");
	setModalZoomOverlayVisible(false);
	modalPanZoom.stopPanning();
	clearModalContent();
	vscode.postMessage({ type: "modalClose" });
}

async function refreshDiagrams(): Promise<void> {
	await renderDiagram();
	if (modalOpen) {
		resetModalTransform();
		await populateModalDiagram();
	}
	updateToolbarButtons();
}

function renderCursorBreadcrumb(ctx: CursorContext | undefined): void {
	const nav = document.getElementById("cursorBreadcrumb");
	if (!nav) {
		return;
	}
	nav.replaceChildren();
	if (!ctx) {
		return;
	}
	const segments = [...ctx.fileSegments, ...ctx.symbolSegments];
	if (segments.length === 0) {
		return;
	}
	for (let i = 0; i < segments.length; i++) {
		if (i > 0) {
			const sep = document.createElement("span");
			sep.className = "cursor-breadcrumb-sep";
			sep.setAttribute("aria-hidden", "true");
			sep.textContent = "›";
			nav.appendChild(sep);
		}
		const span = document.createElement("span");
		span.className = "cursor-breadcrumb-segment";
		if (i === segments.length - 1) {
			span.classList.add("focus");
		}
		span.textContent = segments[i] ?? "";
		nav.appendChild(span);
	}
}

function renderTabs(): void {
	const container = document.getElementById("tabs");
	if (!container) {
		return;
	}
	container.innerHTML = "";
	for (const tab of tabs) {
		const btn = document.createElement("button");
		btn.className = `tab${tab.id === activeTabId ? " active" : ""}`;
		btn.type = "button";
		const icon = TAB_ICONS[tab.id];
		if (icon) {
			btn.appendChild(renderIcon(icon, 14));
		}
		btn.appendChild(document.createTextNode(tab.label));
		btn.addEventListener("click", () => {
			activeTabId = tab.id;
			renderTabs();
			void refreshDiagrams();
			renderDefinition();
		});
		container.appendChild(btn);
	}
}

function renderDefinition(): void {
	const panel = document.getElementById("definition");
	const header = document.getElementById("definitionHeader");
	const body = document.getElementById("definitionBody");
	if (!panel || !header || !body) {
		return;
	}
	const tab = activeTab();
	const snippet = tab?.definitionSnippet;
	const location = tab?.definitionLocation;
	if (snippet) {
		panel.classList.add("visible");
		header.textContent = location ?? "Definition";
		renderHighlightedSnippet(body, snippet, tab?.definitionSnippetHighlights);
	} else {
		panel.classList.remove("visible");
		header.textContent = "";
		body.replaceChildren();
	}
	applySplitSizes();
	updateToolbarButtons();
}

async function renderDiagram(): Promise<void> {
	const diagramEl = document.getElementById("diagramContent");
	if (!diagramEl) {
		return;
	}
	const tab = activeTab();
	if (!tab) {
		diagramEl.innerHTML = "";
		diagramEl.classList.remove("has-diagram");
		setInlineZoomOverlayVisible(false);
		inlinePanZoom.reset();
		return;
	}
	if (!tab.mermaid.trim()) {
		diagramEl.innerHTML = "";
		diagramEl.classList.remove("has-diagram");
		setInlineZoomOverlayVisible(false);
		inlinePanZoom.reset();
		return;
	}
	const ok = await renderMermaid(
		diagramEl,
		tab.mermaid,
		tab.focusedNodeId,
		tab.id,
	);
	diagramEl.classList.toggle("has-diagram", ok);
	setInlineZoomOverlayVisible(ok);
	inlinePanZoom.reset();
}

function activeMermaid(): string {
	const tab = activeTab();
	if (!tab?.mermaid) {
		return "";
	}
	return applyFlowchartDirection(tab.mermaid, diagramDirection);
}

function setupToolbarIcons(): void {
	const copyBtn = document.getElementById("copyBtn");
	if (copyBtn) {
		setButtonIcon(copyBtn, Copy, "Copy diagram code");
	}
	const expandBtn = document.getElementById("expandBtn");
	if (expandBtn) {
		setButtonIcon(expandBtn, Maximize2, "Expand diagram");
	}
	for (const id of [
		"inlineZoomOut",
		"inlineZoomIn",
		"modalZoomOut",
		"modalZoomIn",
	]) {
		const btn = document.getElementById(id);
		if (!btn) {
			continue;
		}
		setButtonIcon(
			btn,
			id.includes("Out") ? ZoomOut : ZoomIn,
			id.includes("Out") ? "Zoom out" : "Zoom in",
		);
	}
	const modalCloseBtn = document.getElementById("modalCloseBtn");
	if (modalCloseBtn) {
		setButtonIcon(modalCloseBtn, X, "Close");
	}
}

function stopOverlayPan(event: Event): void {
	event.stopPropagation();
}

function setupZoomOverlays(): void {
	for (const id of ["inlineZoomOverlay", "modalZoomOverlay"]) {
		document.getElementById(id)?.addEventListener("mousedown", stopOverlayPan);
	}

	document.getElementById("inlineZoomIn")?.addEventListener("click", () => {
		inlinePanZoom.zoomIn();
	});
	document.getElementById("inlineZoomOut")?.addEventListener("click", () => {
		inlinePanZoom.zoomOut();
	});
	document.getElementById("inlineZoomLabel")?.addEventListener("click", () => {
		inlinePanZoom.reset();
	});

	document.getElementById("modalZoomIn")?.addEventListener("click", () => {
		modalPanZoom.zoomIn();
	});
	document.getElementById("modalZoomOut")?.addEventListener("click", () => {
		modalPanZoom.zoomOut();
	});
	document.getElementById("modalZoomReset")?.addEventListener("click", () => {
		resetModalTransform();
	});
}

function setupModalControls(): void {
	document.getElementById("expandBtn")?.addEventListener("click", () => {
		openDiagramModal();
	});

	document.getElementById("diagramModalBackdrop")?.addEventListener("click", () => {
		closeDiagramModal();
	});

	document.getElementById("modalCloseBtn")?.addEventListener("click", () => {
		closeDiagramModal();
	});

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && modalOpen) {
			closeDiagramModal();
		}
	});
}

document.getElementById("copyBtn")?.addEventListener("click", () => {
	vscode.postMessage({ type: "copy", mermaid: activeMermaid() });
});

document.getElementById("flipLayoutBtn")?.addEventListener("click", () => {
	flipDefinitionLayout();
});

document.getElementById("directionBtn")?.addEventListener("click", () => {
	flipDiagramDirection();
});

window.addEventListener("message", (event) => {
	const msg = event.data as unknown;
	if (!isUpdateMessage(msg)) {
		return;
	}
	tabs = msg.tabs;
	activeTabId = msg.activeTab;
	renderCursorBreadcrumb(msg.cursorContext);
	if (msg.definitionPreviewPlacement && !vscode.getState()?.definitionPreviewPlacement) {
		definitionPreviewPlacement = msg.definitionPreviewPlacement;
	}
	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
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
	applyLayout();
	renderTabs();
	void refreshDiagrams();
	renderDefinition();
});

setupSplitter();
inlinePanZoom = createPanZoom("diagramViewport", "diagramContent", {
	wheelBehavior: "pan-or-zoom",
	onZoomChange: updateInlineZoomLabel,
});
modalPanZoom = createPanZoom("diagramModalViewport", "diagramModalContent", {
	isActive: () => modalOpen,
	onZoomChange: updateModalZoomLabel,
	wheelBehavior: "zoom",
});
setupToolbarIcons();
setupZoomOverlays();
setupModalControls();
applyLayout();
updateToolbarButtons();
