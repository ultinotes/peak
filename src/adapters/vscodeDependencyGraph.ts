import * as vscode from "vscode";
import type { DependencyGraphPort, DocumentLinkDto, DocumentSymbolDto, LanguageCommandsPort } from "./ports";
import type { DependencyGraph, GraphEdge, GraphNode } from "../domain/symbol";
import {
	MAX_EXPORT_SYMBOLS_TO_SCAN,
	MAX_GRAPH_NODES,
	fileBasename,
	fileNodeId,
} from "../domain/symbol";
import { mergeDependencyGraph } from "../domain/mermaidDependency";
import { namespaceForUriString } from "./namespacePath";

/** LSP SymbolKind values for import/module-like symbols. */
const IMPORT_KINDS = new Set([
	vscode.SymbolKind.Module,
	vscode.SymbolKind.Package,
	vscode.SymbolKind.Namespace,
]);

/** Top-level symbols scanned for reverse file deps via reference provider. */
const EXPORT_KINDS = new Set([
	vscode.SymbolKind.Class,
	vscode.SymbolKind.Interface,
	vscode.SymbolKind.Function,
	vscode.SymbolKind.Variable,
	vscode.SymbolKind.Constant,
	vscode.SymbolKind.Enum,
	vscode.SymbolKind.Module,
	vscode.SymbolKind.Struct,
	vscode.SymbolKind.Method,
]);

function collectImportSymbols(symbols: DocumentSymbolDto[]): DocumentSymbolDto[] {
	const result: DocumentSymbolDto[] = [];
	const walk = (list: DocumentSymbolDto[]) => {
		for (const s of list) {
			if (IMPORT_KINDS.has(s.kind)) {
				result.push(s);
			}
			if (s.children?.length) {
				walk(s.children);
			}
		}
	};
	walk(symbols);
	return result;
}

function collectExportCandidates(symbols: DocumentSymbolDto[]): DocumentSymbolDto[] {
	return symbols.filter((s) => EXPORT_KINDS.has(s.kind));
}

function ensureFileNode(
	nodes: Map<string, GraphNode>,
	uri: string,
): string {
	const id = fileNodeId(uri);
	if (!nodes.has(id)) {
		nodes.set(id, {
			id,
			label: fileBasename(uri),
			namespace: namespaceForUriString(uri),
		});
	}
	return id;
}

export class VscodeDependencyGraph implements DependencyGraphPort {
	constructor(private readonly commands: LanguageCommandsPort) {}

	async buildGraph(uri: string): Promise<DependencyGraph> {
		const nodes = new Map<string, GraphNode>();
		const edges: GraphEdge[] = [];

		const rootFileId = ensureFileNode(nodes, uri);

		await this.addOutgoingImportEdges(uri, rootFileId, nodes, edges);
		await this.addIncomingImportEdges(uri, rootFileId, nodes, edges);

		return mergeDependencyGraph(rootFileId, nodes, edges);
	}

	private async addOutgoingImportEdges(
		uri: string,
		rootFileId: string,
		nodes: Map<string, GraphNode>,
		edges: GraphEdge[],
	): Promise<void> {
		const symbols = await this.commands.executeDocumentSymbolProvider(uri);
		const seenTargets = new Set<string>();

		const addTarget = (targetUri: string) => {
			if (targetUri === uri || seenTargets.has(targetUri)) {
				return;
			}
			if (nodes.size >= MAX_GRAPH_NODES) {
				return;
			}
			seenTargets.add(targetUri);
			const targetId = ensureFileNode(nodes, targetUri);
			edges.push({ from: rootFileId, to: targetId, label: "imports" });
		};

		const importSymbols = collectImportSymbols(symbols);
		const importSymbolKeys = new Set(
			importSymbols.map(
				(s) => `${s.selectionRange.startLine}:${s.selectionRange.startCharacter}`,
			),
		);
		for (const imp of importSymbols) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			const defs = await this.commands.executeDefinitionProvider(
				uri,
				imp.selectionRange.startLine,
				imp.selectionRange.startCharacter,
			);
			for (const loc of defs) {
				addTarget(loc.uri);
			}
		}

		for (const sym of symbols) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			const symKey = `${sym.selectionRange.startLine}:${sym.selectionRange.startCharacter}`;
			if (importSymbolKeys.has(symKey)) {
				continue;
			}
			const defs = await this.commands.executeDefinitionProvider(
				uri,
				sym.selectionRange.startLine,
				sym.selectionRange.startCharacter,
			);
			for (const loc of defs) {
				addTarget(loc.uri);
			}
		}

		const links = await this.commands.executeDocumentLinkProvider(uri);
		for (const link of links) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			addTarget(link.targetUri);
		}
	}

	private async addIncomingImportEdges(
		uri: string,
		rootFileId: string,
		nodes: Map<string, GraphNode>,
		edges: GraphEdge[],
	): Promise<void> {
		const symbols = await this.commands.executeDocumentSymbolProvider(uri);
		const exportCandidates = collectExportCandidates(symbols).slice(
			0,
			MAX_EXPORT_SYMBOLS_TO_SCAN,
		);
		const seenConsumers = new Set<string>();

		for (const sym of exportCandidates) {
			if (nodes.size >= MAX_GRAPH_NODES) {
				break;
			}
			const refs = await this.commands.executeReferenceProvider(
				uri,
				sym.selectionRange.startLine,
				sym.selectionRange.startCharacter,
			);
			for (const loc of refs) {
				if (loc.uri === uri) {
					continue;
				}
				if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(loc.uri))) {
					continue;
				}
				if (seenConsumers.has(loc.uri)) {
					continue;
				}
				if (nodes.size >= MAX_GRAPH_NODES) {
					break;
				}
				seenConsumers.add(loc.uri);
				const consumerId = ensureFileNode(nodes, loc.uri);
				edges.push({ from: consumerId, to: rootFileId, label: "imports" });
			}
		}
	}
}

export function createDependencyGraphPort(
	commands: LanguageCommandsPort,
): DependencyGraphPort {
	return new VscodeDependencyGraph(commands);
}
