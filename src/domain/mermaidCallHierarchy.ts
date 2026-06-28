import type { CallHierarchyGraph, GraphEdge, GraphNode } from "./symbol";
import { graphToMermaid } from "./mermaidLayout";

export function callHierarchyToMermaid(graph: CallHierarchyGraph): string {
	return graphToMermaid({
		rootId: graph.rootId,
		nodes: graph.nodes,
		edges: graph.edges,
		layoutMode: "symbol",
		isFocused: (node) => node.isRoot === true,
	});
}

export function mergeCallHierarchyGraph(
	rootId: string,
	rootLabel: string,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
): CallHierarchyGraph {
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

export function mergeBidirectionalCallGraph(
	incoming: CallHierarchyGraph,
	outgoing: CallHierarchyGraph | null,
): CallHierarchyGraph {
	const nodes = new Map<string, GraphNode>();
	const edges: GraphEdge[] = [];
	const edgeKeys = new Set<string>();

	for (const graph of [incoming, outgoing]) {
		if (!graph) {
			continue;
		}
		for (const node of graph.nodes) {
			const existing = nodes.get(node.id);
			if (!existing) {
				nodes.set(node.id, { ...node });
			} else if (node.isRoot) {
				existing.isRoot = true;
			}
		}
		for (const edge of graph.edges) {
			const key = `${edge.from}:${edge.to}:${edge.label}`;
			if (edgeKeys.has(key)) {
				continue;
			}
			edgeKeys.add(key);
			edges.push(edge);
		}
	}

	return {
		rootId: incoming.rootId,
		nodes: Array.from(nodes.values()),
		edges,
	};
}
