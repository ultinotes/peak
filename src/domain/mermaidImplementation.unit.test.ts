import * as assert from "assert";
import { implementationToMermaid, mergeImplementationGraph } from "./mermaidImplementation";

const ns = (folder: string, file: string) => ({ folder, file });

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
