import * as assert from "assert";
import {
	definitionToMermaid,
	mergeTypeHierarchyGraph,
	typeHierarchyToMermaid,
} from "./mermaidTypeHierarchy";
import { DIAGRAM_DIMMED_OPACITY } from "./symbol";

const ns = (folder: string, file: string) => ({ folder, file });

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

suite("definitionToMermaid", () => {
	test("renders label and location with focus styling", () => {
		const mermaid = definitionToMermaid("MyFn", "lib.ts:10");
		assert.ok(mermaid.includes('root(["MyFn"])'));
		assert.ok(mermaid.includes('loc["lib.ts:10"]'));
		assert.ok(mermaid.includes("style root stroke-width:3px"));
		assert.ok(mermaid.includes(`style loc opacity:${DIAGRAM_DIMMED_OPACITY}`));
	});

	test("sanitizes quotes in label", () => {
		const mermaid = definitionToMermaid('say "hi"', "a.ts:1");
		assert.ok(!mermaid.includes('"hi"'));
		assert.ok(mermaid.includes("'hi'"));
	});
});
