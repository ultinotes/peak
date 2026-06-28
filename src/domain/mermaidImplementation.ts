import type { GraphEdge, GraphNode, ImplementationGraph } from "./symbol";
import { graphToMermaid } from "./mermaidLayout";

export function implementationToMermaid(graph: ImplementationGraph): string {
	return graphToMermaid({
		rootId: graph.rootId,
		nodes: graph.nodes,
		edges: graph.edges,
		layoutMode: "symbol",
		isFocused: (node) => node.isRoot === true,
	});
}

export function mergeImplementationGraph(
	rootId: string,
	rootLabel: string,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
): ImplementationGraph {
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
