import * as assert from "assert";
import { dependencyToMermaid, mergeDependencyGraph } from "./mermaidDependency";
import { DIAGRAM_DIMMED_OPACITY, fileNodeId } from "./symbol";

const ns = (folder: string, file: string) => ({ folder, file });

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
