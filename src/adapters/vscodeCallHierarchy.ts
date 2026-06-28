import * as vscode from "vscode";
import type { CallHierarchyPort } from "./ports";
import type { CallHierarchyGraph, GraphEdge, GraphNode } from "../domain/symbol";
import { MAX_GRAPH_NODES, nodeId } from "../domain/symbol";
import { mergeCallHierarchyGraph } from "../domain/mermaidCallHierarchy";
import { namespaceForUri } from "./namespacePath";

function callItemLabel(item: vscode.CallHierarchyItem): string {
	return item.detail ? `${item.name} (${item.detail})` : item.name;
}

function itemRange(item: vscode.CallHierarchyItem) {
	return {
		startLine: item.selectionRange.start.line,
		startCharacter: item.selectionRange.start.character,
		endLine: item.selectionRange.end.line,
		endCharacter: item.selectionRange.end.character,
	};
}

export class VscodeCallHierarchy implements CallHierarchyPort {
	async buildDirectedGraph(
		uri: string,
		line: number,
		character: number,
		direction: "in" | "out",
		fallbackLabel: string,
	): Promise<CallHierarchyGraph | null> {
		const roots = await vscode.commands.executeCommand<
			vscode.CallHierarchyItem[]
		>(
			"vscode.prepareCallHierarchy",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		if (!roots?.length) {
			return null;
		}

		const rootItem = roots[0];
		const rootId = nodeId(
			rootItem.uri.toString(),
			rootItem.name,
			itemRange(rootItem),
		);
		const nodes = new Map<string, GraphNode>();
		const edges: GraphEdge[] = [];
		const edgeKeys = new Set<string>();

		const addEdge = (from: string, to: string) => {
			if (from === to) {
				return;
			}
			const key = `${from}:${to}`;
			if (edgeKeys.has(key)) {
				return;
			}
			edgeKeys.add(key);
			edges.push({ from, to, label: "calls" });
		};

		const addNode = (item: vscode.CallHierarchyItem, isRoot = false) => {
			const id = nodeId(item.uri.toString(), item.name, itemRange(item));
			if (!nodes.has(id)) {
				nodes.set(id, {
					id,
					label: callItemLabel(item),
					namespace: namespaceForUri(item.uri),
					isRoot,
				});
			}
			return id;
		};

		addNode(rootItem, true);
		const rootNodeId = nodeId(
			rootItem.uri.toString(),
			rootItem.name,
			itemRange(rootItem),
		);

		if (direction === "in") {
			const incoming = await vscode.commands.executeCommand<
				vscode.CallHierarchyIncomingCall[]
			>("vscode.provideIncomingCalls", rootItem);
			for (const call of incoming ?? []) {
				if (nodes.size >= MAX_GRAPH_NODES) {
					break;
				}
				const fromId = addNode(call.from);
				addEdge(fromId, rootNodeId);
			}
		} else {
			const outgoing = await vscode.commands.executeCommand<
				vscode.CallHierarchyOutgoingCall[]
			>("vscode.provideOutgoingCalls", rootItem);
			for (const call of outgoing ?? []) {
				if (nodes.size >= MAX_GRAPH_NODES) {
					break;
				}
				const toId = addNode(call.to);
				addEdge(rootNodeId, toId);
			}
		}

		if (edges.length === 0 && nodes.size <= 1) {
			return mergeCallHierarchyGraph(rootId, fallbackLabel, nodes, edges);
		}

		const rootLabel = nodes.get(rootId)?.label ?? fallbackLabel;
		return mergeCallHierarchyGraph(rootId, rootLabel, nodes, edges);
	}
}

export function createCallHierarchyPort(): CallHierarchyPort {
	return new VscodeCallHierarchy();
}
