import type { GraphEdge, GraphNode, TypeHierarchyGraph } from "./symbol";
import {
	DIAGRAM_DIMMED_OPACITY,
	sanitizeMermaidLabel,
} from "./symbol";
import { graphToMermaid } from "./mermaidLayout";

export function typeHierarchyToMermaid(graph: TypeHierarchyGraph): string {
	return graphToMermaid({
		rootId: graph.rootId,
		nodes: graph.nodes,
		edges: graph.edges,
		layoutMode: "symbol",
		isFocused: (node) => node.isRoot === true,
	});
}

export function mergeTypeHierarchyGraph(
	rootId: string,
	rootLabel: string,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
): TypeHierarchyGraph {
	const rootNode: GraphNode = { id: rootId, label: rootLabel, isRoot: true };
	if (!nodes.has(rootId)) {
		nodes.set(rootId, rootNode);
	} else {
		nodes.get(rootId)!.isRoot = true;
	}
	return {
		rootId,
		nodes: Array.from(nodes.values()),
		edges,
	};
}

export function definitionToMermaid(label: string, location: string): string {
	const safeLabel = sanitizeMermaidLabel(label);
	const safeLoc = sanitizeMermaidLabel(location);
	return [
		"flowchart TD",
		`  root(["${safeLabel}"])`,
		`  loc["${safeLoc}"]`,
		"  root --> loc",
		"  style root stroke-width:3px",
		`  style loc opacity:${DIAGRAM_DIMMED_OPACITY}`,
		`  linkStyle 0 opacity:${DIAGRAM_DIMMED_OPACITY}`,
	].join("\n");
}
