import * as assert from "assert";
import type { DocumentSymbolDto } from "./ports";
import { enclosingSymbolPath } from "./symbolAtPosition";

function sym(
	name: string,
	startLine: number,
	endLine: number,
	children?: DocumentSymbolDto[],
): DocumentSymbolDto {
	return {
		name,
		kind: 12,
		range: {
			startLine,
			startCharacter: 0,
			endLine,
			endCharacter: 0,
		},
		selectionRange: {
			startLine,
			startCharacter: 0,
			endLine,
			endCharacter: 0,
		},
		children,
	};
}

suite("enclosingSymbolPath", () => {
	test("returns nested path outer to inner", () => {
		const symbols = [
			sym("Outer", 0, 20, [sym("Inner", 5, 15)]),
		];
		assert.deepStrictEqual(enclosingSymbolPath(symbols, 10, 4), [
			"Outer",
			"Inner",
		]);
	});

	test("returns empty when no symbol contains cursor", () => {
		const symbols = [sym("Foo", 0, 5)];
		assert.deepStrictEqual(enclosingSymbolPath(symbols, 10, 0), []);
	});

	test("picks containing branch among siblings", () => {
		const symbols = [
			sym("A", 0, 10),
			sym("B", 0, 20, [sym("BInner", 12, 18)]),
		];
		assert.deepStrictEqual(enclosingSymbolPath(symbols, 14, 2), [
			"B",
			"BInner",
		]);
	});
});
