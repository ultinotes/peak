import {
	ArrowDown,
	ArrowRight,
	Box,
	CircuitBoard,
	Copy,
	createElement,
	Maximize2,
	Network,
	PanelBottom,
	PanelRight,
	ScrollText,
	Search,
	Workflow,
	X,
	ZoomIn,
	ZoomOut,
	type IconNode,
} from "lucide";

export type LucideIcon = IconNode;

export const TAB_ICONS: Record<string, LucideIcon> = {
	calls: Workflow,
	types: Box,
	references: Search,
	implementations: CircuitBoard,
	definition: ScrollText,
	dependencies: Network,
};

export function renderIcon(icon: LucideIcon, size = 16): SVGElement {
	const svg = createElement(icon);
	svg.setAttribute("width", String(size));
	svg.setAttribute("height", String(size));
	svg.setAttribute("aria-hidden", "true");
	return svg;
}

export function setButtonIcon(
	btn: HTMLElement,
	icon: LucideIcon,
	ariaLabel: string,
	size = 16,
): void {
	btn.replaceChildren(renderIcon(icon, size));
	btn.setAttribute("title", ariaLabel);
	btn.setAttribute("aria-label", ariaLabel);
}

export {
	ArrowDown,
	ArrowRight,
	Copy,
	Maximize2,
	PanelBottom,
	PanelRight,
	X,
	ZoomIn,
	ZoomOut,
};
