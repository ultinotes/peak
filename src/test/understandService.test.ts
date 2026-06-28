import * as assert from "assert";
import type {
	CallHierarchyGraph,
	DefinitionView,
	ImplementationGraph,
	ReferenceGraph,
	TypeHierarchyGraph,
} from "../domain/symbol";
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
import { UnderstandService } from "../services/understandService";

class MockViewHost implements PeakViewHost {
	lastTabs: PeakViewTab[] = [];
	lastActive = "";
	open = false;

	async show(tabs: PeakViewTab[], activeTabId: string, _cursorContext?: CursorContext): Promise<void> {
		this.lastTabs = tabs;
		this.lastActive = activeTabId;
		this.open = true;
	}

	isOpen(): boolean {
		return this.open;
	}

	setPanelOpenListener(_listener: ((open: boolean) => void) | undefined): void {}

	dispose(): void {
		this.open = false;
	}
}

class MockCallHierarchy implements CallHierarchyPort {
	constructor(
		private readonly incoming: CallHierarchyGraph | null,
		private readonly outgoing: CallHierarchyGraph | null = null,
	) {}

	async buildDirectedGraph(
		_uri: string,
		_line: number,
		_character: number,
		direction: "in" | "out",
		_fallbackLabel: string,
	): Promise<CallHierarchyGraph | null> {
		return direction === "in" ? this.incoming : this.outgoing;
	}
}

class MockTypeHierarchy implements TypeHierarchyPort {
	constructor(private readonly graph: TypeHierarchyGraph | null) {}

	async buildGraph(): Promise<TypeHierarchyGraph | null> {
		return this.graph;
	}
}

class MockReferenceGraph implements ReferenceGraphPort {
	constructor(private readonly graph: ReferenceGraph | null) {}

	async buildGraph(): Promise<ReferenceGraph | null> {
		return this.graph;
	}
}

class MockImplementationGraph implements ImplementationGraphPort {
	constructor(private readonly graph: ImplementationGraph | null) {}

	async buildGraph(): Promise<ImplementationGraph | null> {
		return this.graph;
	}
}

class MockDefinition implements DefinitionPort {
	constructor(private readonly view: DefinitionView | null) {}

	async fetchDefinition(): Promise<DefinitionView | null> {
		return this.view;
	}
}

class MockDeps implements DependencyGraphPort {
	async buildGraph() {
		return { rootFileId: "f", nodes: [{ id: "f", label: "a.ts" }], edges: [] };
	}
}

function createService(
	host: MockViewHost,
	overrides?: {
		call?: MockCallHierarchy;
		type?: MockTypeHierarchy;
		ref?: MockReferenceGraph;
		impl?: MockImplementationGraph;
		def?: MockDefinition;
	},
): UnderstandService {
	return new UnderstandService(
		overrides?.call ?? new MockCallHierarchy(null),
		overrides?.type ?? new MockTypeHierarchy(null),
		overrides?.ref ?? new MockReferenceGraph(null),
		overrides?.impl ?? new MockImplementationGraph(null),
		overrides?.def ?? new MockDefinition(null),
		new MockDeps(),
		host,
	);
}

suite("UnderstandService router", () => {
	test("adds calls tab when call hierarchy available", async () => {
		const host = new MockViewHost();
		const callGraph: CallHierarchyGraph = {
			rootId: "r",
			nodes: [{ id: "r", label: "fn", isRoot: true }],
			edges: [],
		};
		const service = createService(host, {
			call: new MockCallHierarchy(callGraph),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		assert.ok(host.lastTabs.some((t) => t.id === "calls"));
		assert.strictEqual(host.lastActive, "calls");
		assert.strictEqual(host.lastTabs.find((t) => t.id === "calls")!.focusedNodeId, "r");
	});

	test("adds types tab alongside calls when both available", async () => {
		const host = new MockViewHost();
		const callGraph: CallHierarchyGraph = {
			rootId: "r",
			nodes: [{ id: "r", label: "fn", isRoot: true }],
			edges: [],
		};
		const typeGraph: TypeHierarchyGraph = {
			rootId: "t",
			nodes: [{ id: "t", label: "MyType", isRoot: true }],
			edges: [],
		};
		const service = createService(host, {
			call: new MockCallHierarchy(callGraph),
			type: new MockTypeHierarchy(typeGraph),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		assert.ok(host.lastTabs.some((t) => t.id === "calls"));
		assert.ok(host.lastTabs.some((t) => t.id === "types"));
		assert.strictEqual(host.lastActive, "calls");
	});

	test("adds types tab when only type hierarchy available", async () => {
		const host = new MockViewHost();
		const typeGraph: TypeHierarchyGraph = {
			rootId: "t",
			nodes: [{ id: "t", label: "MyType", isRoot: true }],
			edges: [],
		};
		const service = createService(host, {
			type: new MockTypeHierarchy(typeGraph),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		assert.ok(host.lastTabs.some((t) => t.id === "types"));
		assert.strictEqual(host.lastActive, "types");
	});

	test("adds definition with snippet", async () => {
		const host = new MockViewHost();
		const service = createService(host, {
			def: new MockDefinition({
				label: "Definition",
				location: "lib.ts:1",
				snippet: "export interface Foo {}",
			}),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		const defTab = host.lastTabs.find((t) => t.id === "definition");
		assert.ok(defTab);
		assert.strictEqual(defTab!.definitionSnippet, "export interface Foo {}");
		assert.strictEqual(defTab!.focusedNodeId, "root");
		assert.strictEqual(host.lastActive, "definition");
	});

	test("adds references tab when reference graph available", async () => {
		const host = new MockViewHost();
		const refGraph: ReferenceGraph = {
			rootId: "r",
			nodes: [
				{ id: "r", label: "fn", isRoot: true },
				{ id: "u", label: "use.ts:10" },
			],
			edges: [{ from: "u", to: "r", label: "references" }],
		};
		const service = createService(host, {
			ref: new MockReferenceGraph(refGraph),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		assert.ok(host.lastTabs.some((t) => t.id === "references"));
	});

	test("adds implementations tab when implementation graph available", async () => {
		const host = new MockViewHost();
		const implGraph: ImplementationGraph = {
			rootId: "r",
			nodes: [
				{ id: "r", label: "Iface", isRoot: true },
				{ id: "i", label: "impl.ts:5" },
			],
			edges: [{ from: "r", to: "i", label: "implements" }],
		};
		const service = createService(host, {
			impl: new MockImplementationGraph(implGraph),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		assert.ok(host.lastTabs.some((t) => t.id === "implementations"));
	});

	test("calls tab shows incoming when no outgoing calls", async () => {
		const host = new MockViewHost();
		const callGraph: CallHierarchyGraph = {
			rootId: "r",
			nodes: [
				{ id: "r", label: "fn", isRoot: true },
				{ id: "c", label: "caller" },
			],
			edges: [{ from: "c", to: "r", label: "calls" }],
		};
		const service = createService(host, {
			call: new MockCallHierarchy(callGraph, null),
		});
		await service.run({ uri: "file:///a.ts", line: 0, character: 0 });
		const callsTab = host.lastTabs.find((t) => t.id === "calls");
		assert.ok(callsTab);
		assert.ok(callsTab!.mermaid.length > 0);
	});
});
