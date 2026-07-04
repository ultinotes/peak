import * as assert from "assert";
import {
	callHierarchyToMermaid,
	mergeBidirectionalCallGraph,
	mergeCallHierarchyGraph,
} from "./mermaidCallHierarchy";
import { DIAGRAM_DIMMED_OPACITY } from "./symbol";

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
