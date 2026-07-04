import * as assert from "assert";
import {
	dotSegmentForColor,
	graphHasDiagramContent,
	hashSegmentToFillColor,
	nodeFillColorForLabel,
	nodeFillColorForNode,
	nodeId,
} from "./symbol";

const ns = (folder: string, file: string) => ({ folder, file });

suite("nodeId", () => {
	test("produces distinct ids for long paths", () => {
		const range = {
			startLine: 10,
			startCharacter: 4,
			endLine: 10,
			endCharacter: 20,
		};
		const a = nodeId(
			"file:///home/user/project/src/adapters/vscodeCallHierarchy.ts",
			"buildGraph",
			range,
		);
		const b = nodeId(
			"file:///home/user/project/src/adapters/vscodeDependencyGraph.ts",
			"buildGraph",
			range,
		);
		assert.notStrictEqual(a, b);
		assert.ok(a.startsWith("n_"));
		assert.ok(b.startsWith("n_"));
	});

	test("is deterministic", () => {
		const range = { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 1 };
		const uri = "file:///test.ts";
		assert.strictEqual(
			nodeId(uri, "foo", range),
			nodeId(uri, "foo", range),
		);
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
