import * as assert from "assert";
import {
	callHierarchyToMermaid,
	mergeBidirectionalCallGraph,
	mergeCallHierarchyGraph,
} from "../domain/mermaidCallHierarchy";
import { dependencyToMermaid, mergeDependencyGraph } from "../domain/mermaidDependency";
import {
	mergeTypeHierarchyGraph,
	typeHierarchyToMermaid,
} from "../domain/mermaidTypeHierarchy";
import {
	mergeReferenceGraph,
	referenceToMermaid,
} from "../domain/mermaidReference";
import {
	implementationToMermaid,
	mergeImplementationGraph,
} from "../domain/mermaidImplementation";
import { decodeSemanticTokens } from "../domain/semanticHighlight";
import {
	DIAGRAM_DIMMED_OPACITY,
	dotSegmentForColor,
	fileNodeId,
	graphHasDiagramContent,
	hashSegmentToFillColor,
	nodeFillColorForLabel,
	nodeFillColorForNode,
} from "../domain/symbol";

const ns = (folder: string, file: string) => ({ folder, file });

suite("Mermaid call hierarchy", () => {
	test("renders root, callers, and callees with calls labels", () => {
		const graph = mergeCallHierarchyGraph(
			"root",
			"main",
			new Map([
				[
					"root",
					{
						id: "root",
						label: "main",
						namespace: ns("src", "app.ts"),
						isRoot: true,
					},
				],
				[
					"caller",
					{
						id: "caller",
						label: "callerFn",
						namespace: ns("src", "app.ts"),
					},
				],
				[
					"callee",
					{
						id: "callee",
						label: "calleeFn",
						namespace: ns("src", "lib.ts"),
					},
				],
			]),
			[
				{ from: "caller", to: "root", label: "calls" },
				{ from: "root", to: "callee", label: "calls" },
			],
		);
		const mermaid = callHierarchyToMermaid(graph);
		assert.ok(mermaid.includes("flowchart TD"));
		assert.ok(mermaid.includes('root(["main"])'));
		assert.ok(!mermaid.includes(" — "));
		assert.ok(mermaid.includes("subgraph"));
		assert.ok(mermaid.includes("stroke-dasharray:5 5"));
		assert.ok(mermaid.includes("caller -->|calls| root"));
		assert.ok(mermaid.includes("root -->|calls| callee"));
		assert.ok(mermaid.includes(`style root stroke-width:3px`));
		assert.ok(mermaid.includes(`style caller opacity:${DIAGRAM_DIMMED_OPACITY}`));
		assert.ok(mermaid.includes(`linkStyle 0 opacity:${DIAGRAM_DIMMED_OPACITY}`));
	});

	test("mergeBidirectionalCallGraph combines both directions", () => {
		const incoming = mergeCallHierarchyGraph(
			"root",
			"main",
			new Map([
				["root", { id: "root", label: "main", isRoot: true }],
				["caller", { id: "caller", label: "callerFn" }],
			]),
			[{ from: "caller", to: "root", label: "calls" }],
		);
		const outgoing = mergeCallHierarchyGraph(
			"root",
			"main",
			new Map([
				["root", { id: "root", label: "main", isRoot: true }],
				["callee", { id: "callee", label: "calleeFn" }],
			]),
			[{ from: "root", to: "callee", label: "calls" }],
		);
		const merged = mergeBidirectionalCallGraph(incoming, outgoing);
		assert.strictEqual(merged.edges.length, 2);
		assert.ok(merged.nodes.some((n) => n.id === "caller"));
		assert.ok(merged.nodes.some((n) => n.id === "callee"));
		const mermaid = callHierarchyToMermaid(merged);
		assert.ok(mermaid.includes("caller -->|calls| root"));
		assert.ok(mermaid.includes("root -->|calls| callee"));
	});

	test("empty graph returns blank mermaid", () => {
		const mermaid = callHierarchyToMermaid({
			rootId: "empty",
			nodes: [],
			edges: [],
		});
		assert.strictEqual(mermaid, "");
	});

	test("root-only graph returns blank mermaid", () => {
		const mermaid = callHierarchyToMermaid({
			rootId: "root",
			nodes: [{ id: "root", label: "main", isRoot: true }],
			edges: [],
		});
		assert.strictEqual(mermaid, "");
	});
});

suite("Mermaid type hierarchy", () => {
	test("renders supertypes and subtypes with labels", () => {
		const graph = mergeTypeHierarchyGraph(
			"root",
			"MyClass",
			new Map([
				[
					"root",
					{
						id: "root",
						label: "MyClass",
						namespace: ns("src", "app.ts"),
						isRoot: true,
					},
				],
				["base", { id: "base", label: "Base", namespace: ns("src", "base.ts") }],
				["sub", { id: "sub", label: "Sub", namespace: ns("src", "sub.ts") }],
			]),
			[
				{ from: "base", to: "root", label: "extends" },
				{ from: "root", to: "sub", label: "implements" },
			],
		);
		const mermaid = typeHierarchyToMermaid(graph);
		assert.ok(mermaid.includes("base -->|extends| root"));
		assert.ok(mermaid.includes("root -->|implements| sub"));
		assert.ok(mermaid.includes(`style base opacity:${DIAGRAM_DIMMED_OPACITY}`));
		assert.ok(mermaid.includes("subgraph"));
	});
});

suite("Mermaid dependency graph", () => {
	test("renders file and imports edges in both directions", () => {
		const graph = mergeDependencyGraph(
			"file",
			new Map([
				[
					"file",
					{ id: "file", label: "app.ts", namespace: ns("src", "app.ts") },
				],
				[
					"dep",
					{ id: "dep", label: "lib.ts", namespace: ns("src", "lib.ts") },
				],
				[
					"consumer",
					{
						id: "consumer",
						label: "main.ts",
						namespace: ns("src", "main.ts"),
					},
				],
			]),
			[
				{ from: "file", to: "dep", label: "imports" },
				{ from: "consumer", to: "file", label: "imports" },
			],
		);
		const mermaid = dependencyToMermaid(graph);
		assert.ok(mermaid.includes("flowchart TD"));
		assert.ok(!mermaid.includes("flowchart LR"));
		assert.ok(mermaid.includes("file -->|imports| dep"));
		assert.ok(mermaid.includes("consumer -->|imports| file"));
		assert.ok(mermaid.includes(`style dep opacity:${DIAGRAM_DIMMED_OPACITY}`));
		assert.ok(mermaid.includes("subgraph"));
	});

	test("multi-dot filename gets segment-based fill color", () => {
		const id = fileNodeId("/proj/utils.test.ts");
		const depId = fileNodeId("/proj/other.ts");
		const graph = mergeDependencyGraph(
			id,
			new Map([
				[
					id,
					{
						id,
						label: "utils.test.ts",
						namespace: ns("proj", "utils.test.ts"),
					},
				],
				[
					depId,
					{
						id: depId,
						label: "other.ts",
						namespace: ns("proj", "other.ts"),
					},
				],
			]),
			[{ from: id, to: depId, label: "imports" }],
		);
		const mermaid = dependencyToMermaid(graph);
		assert.ok(mermaid.includes(`style ${id} fill:#`));
		assert.ok(!mermaid.includes("fill:hsl("));
	});

	test("simple filename has no fill color on root", () => {
		const id = fileNodeId("/proj/app.ts");
		const depId = fileNodeId("/proj/lib.ts");
		const graph = mergeDependencyGraph(
			id,
			new Map([
				[
					id,
					{ id, label: "app.ts", namespace: ns("proj", "app.ts") },
				],
				[
					depId,
					{ id: depId, label: "lib.ts", namespace: ns("proj", "lib.ts") },
				],
			]),
			[{ from: id, to: depId, label: "imports" }],
		);
		const mermaid = dependencyToMermaid(graph);
		assert.ok(mermaid.includes(`style ${id} stroke-width:3px`));
		assert.ok(!mermaid.includes(`style ${id} fill:`));
	});

	test("empty graph returns blank mermaid", () => {
		const mermaid = dependencyToMermaid({
			rootFileId: "file",
			nodes: [],
			edges: [],
		});
		assert.strictEqual(mermaid, "");
	});
});

suite("Filename segment color helpers", () => {
	test("dotSegmentForColor extracts second segment", () => {
		assert.strictEqual(dotSegmentForColor("utils.test.ts"), "test");
		assert.strictEqual(dotSegmentForColor("app.ts"), undefined);
		assert.strictEqual(dotSegmentForColor("index.d.ts"), undefined);
	});

	test("hashSegmentToFillColor is deterministic hex", () => {
		const a = hashSegmentToFillColor("test");
		const b = hashSegmentToFillColor("test");
		assert.strictEqual(a, b);
		assert.ok(a.startsWith("#"));
		assert.ok(!a.includes("hsl"));
	});

	test("nodeFillColorForNode uses namespace file", () => {
		assert.ok(
			nodeFillColorForNode({
				label: "fn",
				namespace: ns("src", "utils.spec.ts"),
			}),
		);
		assert.strictEqual(
			nodeFillColorForNode({ label: "fn", namespace: ns("src", "app.ts") }),
			undefined,
		);
	});

	test("nodeFillColorForLabel works for legacy call hierarchy labels", () => {
		assert.ok(nodeFillColorForLabel("fn — utils.spec.ts"));
		assert.strictEqual(nodeFillColorForLabel("fn — app.ts"), undefined);
	});

	test("graphHasDiagramContent requires edges", () => {
		assert.strictEqual(graphHasDiagramContent([]), false);
		assert.strictEqual(
			graphHasDiagramContent([{ from: "a", to: "b", label: "calls" }]),
			true,
		);
	});
});

suite("Semantic highlight decode", () => {
	test("decodes tokens into snippet-relative spans", () => {
		const snippet = "const x = 1";
		const data = new Uint32Array([
			0, 0, 5, 0, 0,
			0, 6, 1, 1, 0,
			0, 2, 1, 2, 0,
		]);
		const legend = {
			tokenTypes: ["keyword", "variable", "number"],
			tokenModifiers: [],
		};
		const range = { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 11 };
		const spans = decodeSemanticTokens(data, legend, range, 0, snippet);
		assert.strictEqual(spans.length, 3);
		assert.strictEqual(spans[0].tokenType, "keyword");
		assert.strictEqual(spans[0].start, 0);
		assert.strictEqual(spans[0].length, 5);
		assert.strictEqual(spans[1].tokenType, "variable");
		assert.strictEqual(spans[1].start, 6);
	});

	test("decodes tokens when snippet starts below document origin", () => {
		const snippet = "    export const x = 1";
		const snippetStartLine = 10;
		const data = new Uint32Array([10, 4, 6, 0, 0, 0, 7, 5, 0, 0]);
		const legend = {
			tokenTypes: ["keyword"],
			tokenModifiers: [],
		};
		const range = {
			startLine: 10,
			startCharacter: 0,
			endLine: 10,
			endCharacter: snippet.length,
		};
		const spans = decodeSemanticTokens(
			data,
			legend,
			range,
			snippetStartLine,
			snippet,
		);
		assert.strictEqual(spans.length, 2);
		assert.strictEqual(spans[0].start, 4);
		assert.strictEqual(spans[0].length, 6);
		assert.strictEqual(spans[1].start, 11);
		assert.strictEqual(spans[1].length, 5);
	});
});

suite("Mermaid reference graph", () => {
	test("renders references edges", () => {
		const graph = mergeReferenceGraph(
			"root",
			"fn",
			new Map([
				["root", { id: "root", label: "fn", isRoot: true, namespace: ns("src", "a.ts") }],
				["use", { id: "use", label: "b.ts:10", namespace: ns("src", "b.ts") }],
			]),
			[{ from: "use", to: "root", label: "references" }],
		);
		const mermaid = referenceToMermaid(graph);
		assert.ok(mermaid.includes("-->|references|"));
		assert.ok(mermaid.includes('root(["fn"])'));
	});
});

suite("Mermaid implementation graph", () => {
	test("renders implements edges", () => {
		const graph = mergeImplementationGraph(
			"root",
			"Iface",
			new Map([
				["root", { id: "root", label: "Iface", isRoot: true, namespace: ns("src", "a.ts") }],
				["impl", { id: "impl", label: "b.ts:5", namespace: ns("src", "b.ts") }],
			]),
			[{ from: "root", to: "impl", label: "implements" }],
		);
		const mermaid = implementationToMermaid(graph);
		assert.ok(mermaid.includes("-->|implements|"));
		assert.ok(mermaid.includes('root(["Iface"])'));
	});
});
