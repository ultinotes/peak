import {
	callHierarchyToMermaid,
	mergeBidirectionalCallGraph,
} from "../domain/mermaidCallHierarchy";
import { dependencyToMermaid } from "../domain/mermaidDependency";
import { implementationToMermaid } from "../domain/mermaidImplementation";
import { referenceToMermaid } from "../domain/mermaidReference";
import {
	definitionToMermaid,
	typeHierarchyToMermaid,
} from "../domain/mermaidTypeHierarchy";
import type {
	CallHierarchyPort,
	DefinitionPort,
	DependencyGraphPort,
	ImplementationGraphPort,
	PeakViewHost,
	PeakViewTab,
	ReferenceGraphPort,
	TypeHierarchyPort,
	CursorContext,
} from "../adapters/ports";

export interface UnderstandRequest {
	uri: string;
	line: number;
	character: number;
}

export interface UnderstandOptions {
	quiet?: boolean;
}

const SYMBOL_TAB_ORDER = [
	"calls",
	"types",
	"references",
	"implementations",
	"definition",
] as const;

export class UnderstandService {
	constructor(
		private readonly callHierarchy: CallHierarchyPort,
		private readonly typeHierarchy: TypeHierarchyPort,
		private readonly referenceGraph: ReferenceGraphPort,
		private readonly implementationGraph: ImplementationGraphPort,
		private readonly definition: DefinitionPort,
		private readonly dependencyGraph: DependencyGraphPort,
		private readonly viewHost: PeakViewHost,
	) {}

	async run(
		request: UnderstandRequest,
		options?: UnderstandOptions,
		cursorContext?: CursorContext,
	): Promise<string[]> {
		const warnings: string[] = [];
		const tabs: PeakViewTab[] = [];
		const { uri, line, character } = request;

		const callers = await this.callHierarchy.buildDirectedGraph(
			uri,
			line,
			character,
			"in",
			"symbol",
		);
		if (callers) {
			const callees = await this.callHierarchy.buildDirectedGraph(
				uri,
				line,
				character,
				"out",
				"symbol",
			);
			const merged = mergeBidirectionalCallGraph(callers, callees);
			tabs.push({
				id: "calls",
				label: "Calls",
				mermaid: callHierarchyToMermaid(merged),
				focusedNodeId: callers.rootId,
			});
		}

		const types = await this.typeHierarchy.buildGraph(
			uri,
			line,
			character,
			"symbol",
		);
		if (types) {
			tabs.push({
				id: "types",
				label: "Types",
				mermaid: typeHierarchyToMermaid(types),
				focusedNodeId: types.rootId,
			});
		}

		const references = await this.referenceGraph.buildGraph(
			uri,
			line,
			character,
		);
		if (references) {
			tabs.push({
				id: "references",
				label: "References",
				mermaid: referenceToMermaid(references),
				focusedNodeId: references.rootId,
			});
		}

		const implementations = await this.implementationGraph.buildGraph(
			uri,
			line,
			character,
		);
		if (implementations) {
			tabs.push({
				id: "implementations",
				label: "Implementations",
				mermaid: implementationToMermaid(implementations),
				focusedNodeId: implementations.rootId,
			});
		}

		const def = await this.definition.fetchDefinition(uri, line, character);
		if (def) {
			tabs.push({
				id: "definition",
				label: "Definition",
				mermaid: definitionToMermaid(def.label, def.location),
				focusedNodeId: "root",
				definitionSnippet: def.snippet,
				definitionLocation: def.location,
				definitionSnippetHighlights: def.snippetHighlights,
			});
		}

		const symbolTabs = tabs.filter((t) => t.id !== "dependencies");
		if (symbolTabs.length === 0 && !options?.quiet) {
			warnings.push(
				"No symbol graphs found at cursor — language server may not support providers for this symbol.",
			);
		}

		const depGraph = await this.dependencyGraph.buildGraph(uri);
		const hasOutgoing = depGraph.edges.some((e) => e.from === depGraph.rootFileId);
		const hasIncoming = depGraph.edges.some((e) => e.to === depGraph.rootFileId);
		if (depGraph.nodes.length <= 1 && depGraph.edges.length === 0) {
			if (!options?.quiet) {
				warnings.push(
					"Dependency graph is empty — check that the language server exposes definition and reference providers.",
				);
			}
		} else if (!options?.quiet) {
			if (hasOutgoing && !hasIncoming) {
				warnings.push(
					"No incoming file dependencies found — reference provider may not cover exports in this file.",
				);
			} else if (!hasOutgoing && hasIncoming) {
				warnings.push(
					"No outgoing imports found — document symbol or definition providers may not list imports.",
				);
			}
		}

		tabs.push({
			id: "dependencies",
			label: "Dependencies",
			mermaid: dependencyToMermaid(depGraph),
			focusedNodeId: depGraph.rootFileId,
		});

		const activeTabId = this.pickActiveTab(tabs);
		await this.viewHost.show(tabs, activeTabId, cursorContext);
		return warnings;
	}

	private pickActiveTab(tabs: PeakViewTab[]): string {
		for (const id of SYMBOL_TAB_ORDER) {
			const tab = tabs.find((t) => t.id === id);
			if (tab && tab.mermaid.trim()) {
				return id;
			}
		}
		return "dependencies";
	}
}
