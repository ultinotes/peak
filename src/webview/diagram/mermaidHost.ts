import "./mermaidInit";
import mermaid from "mermaid";
import type { FlowchartDirection } from "../../shared/webviewProtocol";

export type { FlowchartDirection };

export function applyFlowchartDirection(
	source: string,
	dir: FlowchartDirection,
): string {
	return source.replace(/^flowchart\s+(TD|LR)/i, `flowchart ${dir}`);
}

let renderCounter = 0;

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

export function emphasizeFocusedNode(
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

export async function renderMermaid(
	targetEl: HTMLElement,
	source: string,
	focusedNodeId: string | undefined,
	renderId: string,
	direction: FlowchartDirection,
	forModal = false,
): Promise<boolean> {
	if (!source.trim()) {
		targetEl.innerHTML = "";
		return false;
	}
	const directed = applyFlowchartDirection(source, direction);
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

export function normalizeModalSvg(
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

export function cloneSvgToModal(): boolean {
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

export function clearModalContent(): void {
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
