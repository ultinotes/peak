export interface RangeDto {
	startLine: number;
	startCharacter: number;
	endLine: number;
	endCharacter: number;
}

export interface NamespacePath {
	folder: string;
	file: string;
}

export interface GraphNode {
	id: string;
	label: string;
	namespace?: NamespacePath;
	isRoot?: boolean;
}

export type GraphEdgeLabel =
	| "calls"
	| "imports"
	| "extends"
	| "implements"
	| "references";

export interface GraphEdge {
	from: string;
	to: string;
	label: GraphEdgeLabel;
}

export interface CallHierarchyGraph {
	rootId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface TypeHierarchyGraph {
	rootId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface ReferenceGraph {
	rootId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface ImplementationGraph {
	rootId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface DependencyGraph {
	rootFileId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface HighlightSpan {
	start: number;
	length: number;
	tokenType: string;
	modifiers?: string[];
}

export interface DefinitionView {
	label: string;
	location: string;
	snippet: string;
	snippetHighlights?: HighlightSpan[];
}

/** Root-only graphs (no edges) render as empty diagram tabs. */
export function graphHasDiagramContent(edges: GraphEdge[]): boolean {
	return edges.length > 0;
}

/** Non-focused diagram nodes and edges use this opacity (ADR-0003 focus styling). */
export const DIAGRAM_DIMMED_OPACITY = 0.4;

export function mermaidNodeStyleLine(
	nodeId: string,
	node: Pick<GraphNode, "label" | "namespace">,
	isFocused: boolean,
): string | undefined {
	const parts: string[] = [];
	const fill = nodeFillColorForNode(node);
	if (fill) {
		parts.push(`fill:${fill}`);
	}
	if (isFocused) {
		// Assumption (ADR-0003): inner ring of double-border focus styling.
		parts.push("stroke-width:3px");
	} else {
		parts.push(`opacity:${DIAGRAM_DIMMED_OPACITY}`);
	}
	if (parts.length === 0) {
		return undefined;
	}
	return `  style ${nodeId} ${parts.join(",")}`;
}

export function mermaidLinkStyleLines(edgeCount: number): string[] {
	const lines: string[] = [];
	for (let i = 0; i < edgeCount; i++) {
		lines.push(`  linkStyle ${i} opacity:${DIAGRAM_DIMMED_OPACITY}`);
	}
	return lines;
}

/** Assumption (ADR-0004): depth 1 matches VS Code peek first expand. */
export const PEEK_HIERARCHY_DEPTH = 1;

/** Hard-coded until settings ADR — caps total nodes per diagram. */
export const MAX_GRAPH_NODES = 40;

/** Hard-coded until settings ADR — caps reference-provider scans for reverse file deps. */
export const MAX_EXPORT_SYMBOLS_TO_SCAN = 8;

/** Lines above/below definition range for peek-style snippet. */
export const DEFINITION_SNIPPET_CONTEXT_LINES = 15;

const FILE_RANGE: RangeDto = {
	startLine: 0,
	startCharacter: 0,
	endLine: 0,
	endCharacter: 0,
};

function hashKey(input: string): string {
	let hash = 5381;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 33) ^ input.charCodeAt(i);
	}
	return Math.abs(hash).toString(36);
}

export function nodeId(uri: string, name: string, range: RangeDto): string {
	const key = `${uri}\0${name}\0${range.startLine}\0${range.startCharacter}\0${range.endLine}\0${range.endCharacter}`;
	return `n_${hashKey(key)}`;
}

export function fileNodeId(uri: string): string {
	return nodeId(uri, fileBasename(uri), FILE_RANGE);
}

export function sanitizeMermaidLabel(label: string): string {
	return label.replace(/"/g, "'").replace(/[\[\](){}#;|]/g, " ").trim() || "?";
}

export function fileBasename(uri: string): string {
	const parts = uri.replace(/\\/g, "/").split("/");
	return parts[parts.length - 1] || uri;
}

/** Strip known file extension before reading dot-segments (e.g. utils.test.ts → utils.test). */
const COLOR_EXT_RE = /\.(?:tsx?|jsx?|mjs|cjs|py|rs|go)$/i;

/** Second dot-segment of stem after extension strip (e.g. utils.test.ts → test). */
export function dotSegmentForColor(basename: string): string | undefined {
	const stem = basename.replace(COLOR_EXT_RE, "");
	const parts = stem.split(".");
	if (parts.length < 2) {
		return undefined;
	}
	const segment = parts[1];
	if (segment.length < 2) {
		return undefined;
	}
	return segment;
}

function hslToHex(h: number, s: number, l: number): string {
	const sat = s / 100;
	const light = l / 100;
	const c = (1 - Math.abs(2 * light - 1)) * sat;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = light - c / 2;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	const toByte = (v: number) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Deterministic fill color from segment hash — hex for Mermaid style parser. */
export function hashSegmentToFillColor(segment: string): string {
	let hash = 5381;
	for (let i = 0; i < segment.length; i++) {
		hash = (hash * 33) ^ segment.charCodeAt(i);
	}
	const hue = Math.abs(hash) % 360;
	return hslToHex(hue, 45, 35);
}

/** Extract trailing filename from call-hierarchy labels like "fn — file.ts". */
export function basenameFromCallHierarchyLabel(label: string): string | undefined {
	const sep = " — ";
	const idx = label.lastIndexOf(sep);
	if (idx === -1) {
		return undefined;
	}
	return label.slice(idx + sep.length);
}

export function nodeFillColorForNode(
	node: Pick<GraphNode, "label" | "namespace">,
): string | undefined {
	const basename =
		node.namespace?.file ??
		basenameFromCallHierarchyLabel(node.label) ??
		node.label;
	const segment = dotSegmentForColor(basename);
	if (!segment) {
		return undefined;
	}
	return hashSegmentToFillColor(segment);
}

/** @deprecated Prefer nodeFillColorForNode — kept for tests using legacy labels. */
export function nodeFillColorForLabel(label: string): string | undefined {
	return nodeFillColorForNode({ label });
}

/** Workspace-relative folder + file basename for nested Mermaid subgraphs (ADR-0003). */
export function namespacePathFromUri(
	uri: string,
	workspaceFolders?: string[],
): NamespacePath {
	const normalized = uri.replace(/^file:\/\//, "").replace(/\\/g, "/");
	const parts = normalized.split("/");
	const file = parts[parts.length - 1] || uri;

	if (workspaceFolders?.length) {
		for (const root of workspaceFolders) {
			const normRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
			if (
				normalized.startsWith(`${normRoot}/`) ||
				normalized === normRoot
			) {
				const rel = normalized.slice(normRoot.length).replace(/^\//, "");
				const relParts = rel.split("/");
				relParts.pop();
				const folder = relParts.length ? relParts.join("/") : ".";
				return { folder, file };
			}
		}
	}

	if (parts.length > 1) {
		parts.pop();
		return { folder: parts.join("/"), file };
	}
	return { folder: ".", file };
}

export function extractSnippet(
	lines: string[],
	range: RangeDto,
	contextLines: number,
): string {
	const start = Math.max(0, range.startLine - contextLines);
	const end = Math.min(lines.length - 1, range.endLine + contextLines);
	return lines.slice(start, end + 1).join("\n");
}
