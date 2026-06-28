import * as vscode from "vscode";
import type { LanguageCommandsPort, TypeHierarchyPort } from "./ports";
import type { GraphEdge, GraphNode, TypeHierarchyGraph } from "../domain/symbol";
import { MAX_GRAPH_NODES, nodeId } from "../domain/symbol";
import { mergeTypeHierarchyGraph } from "../domain/mermaidTypeHierarchy";
import { namespaceForUri } from "./namespacePath";

function typeItemLabel(item: vscode.TypeHierarchyItem): string {
	return item.detail ? `${item.name} (${item.detail})` : item.name;
}

function itemRange(item: vscode.TypeHierarchyItem) {
	return {
		startLine: item.selectionRange.start.line,
		startCharacter: item.selectionRange.start.character,
		endLine: item.selectionRange.end.line,
		endCharacter: item.selectionRange.end.character,
	};
}

export class VscodeTypeHierarchy implements TypeHierarchyPort {
	constructor(private readonly commands: LanguageCommandsPort) {}

	async buildGraph(
		uri: string,
		line: number,
		character: number,
		fallbackLabel: string,
	): Promise<TypeHierarchyGraph | null> {
		const roots = await this.commands.prepareTypeHierarchy(uri, line, character);
		if (!roots.length) {
			return null;
		}

		const rootItems = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>(
			"vscode.prepareTypeHierarchy",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		if (!rootItems?.length) {
			return null;
		}

		const root = rootItems[0];
		const rootId = nodeId(root.uri.toString(), root.name, itemRange(root));
		const nodes = new Map<string, GraphNode>();
		const edges: GraphEdge[] = [];
		const edgeKeys = new Set<string>();

		const addNode = (item: vscode.TypeHierarchyItem, isRoot = false) => {
			const id = nodeId(item.uri.toString(), item.name, itemRange(item));
			if (!nodes.has(id)) {
				nodes.set(id, {
					id,
					label: typeItemLabel(item),
					namespace: namespaceForUri(item.uri),
					isRoot,
				});
			}
			return id;
		};

		const addEdge = (from: string, to: string, label: "extends" | "implements") => {
			const key = `${from}:${to}:${label}`;
			if (edgeKeys.has(key) || from === to) {
				return;
			}
			edgeKeys.add(key);
			edges.push({ from, to, label });
		};

		addNode(root, true);

		const supertypes = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>("vscode.provideSupertypes", root);
		for (const st of supertypes ?? []) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			const id = addNode(st);
			addEdge(id, rootId, "extends");
		}

		const subtypes = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>("vscode.provideSubtypes", root);
		for (const st of subtypes ?? []) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			const id = addNode(st);
			addEdge(rootId, id, "implements");
		}

		const rootLabel = nodes.get(rootId)?.label ?? roots[0].name ?? fallbackLabel;
		return mergeTypeHierarchyGraph(rootId, rootLabel, nodes, edges);
	}
}

export function createTypeHierarchyPort(
	commands: LanguageCommandsPort,
): TypeHierarchyPort {
	return new VscodeTypeHierarchy(commands);
}
