import type { DependencyGraph, GraphEdge, GraphNode } from "./symbol";
import { graphToMermaid } from "./mermaidLayout";

export function dependencyToMermaid(graph: DependencyGraph): string {
	return graphToMermaid({
		rootId: graph.rootFileId,
		nodes: graph.nodes,
		edges: graph.edges,
		layoutMode: "file",
		isFocused: (node) => node.id === graph.rootFileId,
	});
}

export function mergeDependencyGraph(
	rootFileId: string,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
): DependencyGraph {
	return {
		rootFileId,
		nodes: Array.from(nodes.values()),
		edges,
	};
}
