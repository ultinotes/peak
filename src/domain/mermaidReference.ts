import type { GraphEdge, GraphNode, ReferenceGraph } from "./symbol";
import { graphToMermaid } from "./mermaidLayout";

export function referenceToMermaid(graph: ReferenceGraph): string {
	return graphToMermaid({
		rootId: graph.rootId,
		nodes: graph.nodes,
		edges: graph.edges,
		layoutMode: "symbol",
		isFocused: (node) => node.isRoot === true,
	});
}

export function mergeReferenceGraph(
	rootId: string,
	rootLabel: string,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
): ReferenceGraph {
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
