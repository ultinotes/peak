import * as vscode from "vscode";
import type { ImplementationGraphPort, LanguageCommandsPort } from "./ports";
import type { GraphEdge, GraphNode } from "../domain/symbol";
import { MAX_GRAPH_NODES, graphHasDiagramContent } from "../domain/symbol";
import {
	mergeImplementationGraph,
} from "../domain/mermaidImplementation";
import { namespaceForUriString } from "./namespacePath";
import {
	enclosingSymbolName,
	locationNodeId,
	locationNodeLabel,
} from "./symbolAtPosition";

export class VscodeImplementationGraph implements ImplementationGraphPort {
	constructor(private readonly commands: LanguageCommandsPort) {}

	async buildGraph(
		uri: string,
		line: number,
		character: number,
	): Promise<import("../domain/symbol").ImplementationGraph | null> {
		const impls = await this.commands.executeImplementationProvider(
			uri,
			line,
			character,
		);
		if (!impls.length) {
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

		for (const impl of impls) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(impl.uri))) {
				continue;
			}
			const implId = locationNodeId(impl);
			if (!nodes.has(implId)) {
				nodes.set(implId, {
					id: implId,
					label: locationNodeLabel(impl),
					namespace: namespaceForUriString(impl.uri),
				});
			}
			const key = `${rootId}:${implId}:implements`;
			if (edgeKeys.has(key)) {
				continue;
			}
			edgeKeys.add(key);
			edges.push({ from: rootId, to: implId, label: "implements" });
		}

		const graph = mergeImplementationGraph(rootId, rootLabel, nodes, edges);
		return graphHasDiagramContent(graph.edges) ? graph : null;
	}
}

export function createImplementationGraphPort(
	commands: LanguageCommandsPort,
): ImplementationGraphPort {
	return new VscodeImplementationGraph(commands);
}
