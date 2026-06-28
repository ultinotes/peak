import * as vscode from "vscode";
import type { LanguageCommandsPort, ReferenceGraphPort } from "./ports";
import type { GraphEdge, GraphNode } from "../domain/symbol";
import { MAX_GRAPH_NODES, graphHasDiagramContent } from "../domain/symbol";
import {
	mergeReferenceGraph,
} from "../domain/mermaidReference";
import { namespaceForUriString } from "./namespacePath";
import {
	enclosingSymbolName,
	locationNodeId,
	locationNodeLabel,
} from "./symbolAtPosition";

export class VscodeReferenceGraph implements ReferenceGraphPort {
	constructor(private readonly commands: LanguageCommandsPort) {}

	async buildGraph(
		uri: string,
		line: number,
		character: number,
	): Promise<import("../domain/symbol").ReferenceGraph | null> {
		const refs = await this.commands.executeReferenceProvider(
			uri,
			line,
			character,
		);
		if (!refs.length) {
			return null;
		}

		const symbols = await this.commands.executeDocumentSymbolProvider(uri);
		const rootLabel =
			enclosingSymbolName(symbols, line, character) ?? "symbol";
		const rootId = locationNodeId({
			uri,
			range: {
				startLine: line,
				startCharacter: character,
				endLine: line,
				endCharacter: character,
			},
		});

		const nodes = new Map<string, GraphNode>();
		const edges: GraphEdge[] = [];
		const edgeKeys = new Set<string>();

		nodes.set(rootId, {
			id: rootId,
			label: rootLabel,
			namespace: namespaceForUriString(uri),
			isRoot: true,
		});

		for (const ref of refs) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			if (ref.uri === uri && ref.range.startLine === line) {
				continue;
			}
			if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(ref.uri))) {
				continue;
			}
			const refId = locationNodeId(ref);
			if (!nodes.has(refId)) {
				nodes.set(refId, {
					id: refId,
					label: locationNodeLabel(ref),
					namespace: namespaceForUriString(ref.uri),
				});
			}
			const key = `${refId}:${rootId}:references`;
			if (edgeKeys.has(key)) {
				continue;
			}
			edgeKeys.add(key);
			edges.push({ from: refId, to: rootId, label: "references" });
		}

		const graph = mergeReferenceGraph(rootId, rootLabel, nodes, edges);
		return graphHasDiagramContent(graph.edges) ? graph : null;
	}
}

export function createReferenceGraphPort(
	commands: LanguageCommandsPort,
): ReferenceGraphPort {
	return new VscodeReferenceGraph(commands);
}
