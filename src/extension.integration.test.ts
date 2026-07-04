import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension integration", () => {
	test("extension activates on load", async () => {
		const ext = vscode.extensions.getExtension("peak.peak");
		assert.ok(ext, "peak.peak extension should be present");
		await ext!.activate();
		assert.ok(ext!.isActive);
	});
});
