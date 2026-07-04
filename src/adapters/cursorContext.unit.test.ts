import * as assert from "assert";
import { namespacePathFromUri } from "../domain/symbol";
import { fileSegmentsFromUri } from "./cursorContext";

suite("fileSegmentsFromUri", () => {
	test("splits workspace-relative folder and file", () => {
		const uri = "file:///home/user/project/src/services/foo.ts";
		const segments = fileSegmentsFromUri(uri, (u) => namespacePathFromUri(u));
		assert.ok(segments.includes("foo.ts"));
		assert.ok(segments.indexOf("foo.ts") === segments.length - 1);
		assert.deepStrictEqual(segments, [
			"home",
			"user",
			"project",
			"src",
			"services",
			"foo.ts",
		]);
	});
});
