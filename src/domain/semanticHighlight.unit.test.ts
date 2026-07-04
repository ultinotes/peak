import * as assert from "assert";
import { decodeSemanticTokens } from "./semanticHighlight";

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
