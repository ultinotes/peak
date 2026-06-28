import * as assert from "assert";
import { fileSegmentsFromUri } from "../adapters/cursorContext";

suite("fileSegmentsFromUri", () => {
	test("splits workspace-relative folder and file", () => {
		// Assumption (ADR-0007): namespaceForUriString uses workspace folders at runtime;
		// this test uses path outside workspace → full path segments from URI.
		const uri = "file:///home/user/project/src/services/foo.ts";
		const segments = fileSegmentsFromUri(uri);
		assert.ok(segments.includes("foo.ts"));
		assert.ok(segments.indexOf("foo.ts") === segments.length - 1);
	});
});
