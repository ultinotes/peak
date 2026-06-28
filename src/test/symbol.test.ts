import * as assert from "assert";
import { nodeId } from "../domain/symbol";

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
