#!/usr/bin/env node
/**
 * Launch Cursor/VS Code Extension Development Host with Peak loaded.
 * Assumption: Cursor reuses a running instance unless --user-data-dir is set;
 * the built-in extensionHost debugger does not pass that flag reliably on Cursor.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const userDataDir = path.join(root, ".vscode-test", "dev-profile");
const executable = process.env.VSCODE_EXECUTABLE_PATH || process.env.CURSOR_PATH || "cursor";

const args = [
	`--extensionDevelopmentPath=${root}`,
	root,
	"--new-window",
	`--user-data-dir=${userDataDir}`,
];

const child = spawn(executable, args, {
	detached: true,
	stdio: "ignore",
});

child.unref();

if (child.pid) {
	console.log(`Peak dev host: ${executable} (pid ${child.pid})`);
	console.log(`  extension: ${root}`);
	console.log(`  profile:   ${userDataDir}`);
} else {
	console.error(`Failed to start ${executable}`);
	process.exit(1);
}
