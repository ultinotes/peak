import type { GraphEdge, GraphNode } from "./symbol";
import {
	graphHasDiagramContent,
	mermaidLinkStyleLines,
	mermaidNodeStyleLine,
	sanitizeMermaidLabel,
} from "./symbol";

export type NestedLayoutMode = "symbol" | "file";

const CLUSTER_DASH_STYLE = "stroke-dasharray:5 5,fill:none";

function sanitizeSubgraphId(prefix: string, path: string): string {
	const safe = path.replace(/[^\w.-]/g, "_").replace(/\./g, "_");
	return `${prefix}_${safe}`;
}

function renderNodeShape(node: GraphNode, isFocused: boolean): string {
	const label = sanitizeMermaidLabel(node.label);
	if (isFocused) {
		return `    ${node.id}(["${label}"])`;
	}
	return `    ${node.id}["${label}"]`;
}

function groupNodesByNamespace(
	nodes: GraphNode[],
	mode: NestedLayoutMode,
): Map<string, Map<string, GraphNode[]>> {
	const byFolder = new Map<string, Map<string, GraphNode[]>>();

	for (const node of nodes) {
		const folder = node.namespace?.folder ?? ".";
		const file = mode === "symbol" ? (node.namespace?.file ?? ".") : folder;
		if (!byFolder.has(folder)) {
			byFolder.set(folder, new Map());
		}
		const byFile = byFolder.get(folder)!;
		if (!byFile.has(file)) {
			byFile.set(file, []);
		}
		byFile.get(file)!.push(node);
	}

	return byFolder;
}

function emitNestedSubgraphs(
	nodes: GraphNode[],
	mode: NestedLayoutMode,
	isFocused: (node: GraphNode) => boolean,
): { lines: string[]; clusterIds: string[] } {
	const lines: string[] = [];
	const clusterIds: string[] = [];
	const byFolder = groupNodesByNamespace(nodes, mode);

	for (const [folder, byFile] of byFolder) {
		const folderId = sanitizeSubgraphId("folder", folder);
		const folderTitle = sanitizeMermaidLabel(folder);
		lines.push(`  subgraph ${folderId} ["${folderTitle}"]`);

		if (mode === "file") {
			for (const fileNodes of byFile.values()) {
				for (const node of fileNodes) {
					lines.push(renderNodeShape(node, isFocused(node)));
				}
			}
		} else {
			for (const [file, fileNodes] of byFile) {
				const fileId = sanitizeSubgraphId(`${folderId}_file`, file);
				const fileTitle = sanitizeMermaidLabel(file);
				lines.push(`    subgraph ${fileId} ["${fileTitle}"]`);
				for (const node of fileNodes) {
					lines.push(renderNodeShape(node, isFocused(node)));
				}
				lines.push("    end");
				clusterIds.push(fileId);
			}
		}

		lines.push("  end");
		clusterIds.push(folderId);
	}

	return { lines, clusterIds };
}

export interface GraphMermaidOptions {
	rootId: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
	layoutMode: NestedLayoutMode;
	isFocused: (node: GraphNode) => boolean;
}

export function graphToMermaid(options: GraphMermaidOptions): string {
	const { nodes, edges, layoutMode, isFocused } = options;

	if (!graphHasDiagramContent(edges)) {
		return "";
	}

	const nodeIds = new Set(nodes.map((n) => n.id));
	const lines: string[] = ["flowchart TD"];
	const validEdges: GraphEdge[] = [];

	const { lines: subgraphLines, clusterIds } = emitNestedSubgraphs(
		nodes,
		layoutMode,
		isFocused,
	);
	lines.push(...subgraphLines);

	for (const clusterId of clusterIds) {
		lines.push(`  style ${clusterId} ${CLUSTER_DASH_STYLE}`);
	}

	for (const edge of edges) {
		if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
			lines.push(`  ${edge.from} -->|${edge.label}| ${edge.to}`);
			validEdges.push(edge);
		}
	}

	lines.push(...mermaidLinkStyleLines(validEdges.length));

	for (const node of nodes) {
		if (!nodeIds.has(node.id)) {
			continue;
		}
		const style = mermaidNodeStyleLine(node.id, node, isFocused(node));
		if (style) {
			lines.push(style);
		}
	}

	return lines.join("\n");
}
