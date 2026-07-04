import * as assert from "assert";
import { mergeReferenceGraph, referenceToMermaid } from "./mermaidReference";

const ns = (folder: string, file: string) => ({ folder, file });

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
