// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import { runPeakUnderstand } from "./commands/peakUnderstand";
import { createPeakConfiguration } from "./adapters/vscodeConfiguration";
import { createWebviewPeakViewHost } from "./adapters/webviewPeakViewHost";
import { CursorFollowService } from "./services/cursorFollowService";

export function activate(context: vscode.ExtensionContext) {
	const config = createPeakConfiguration();
	const viewHost = createWebviewPeakViewHost(context.extensionUri, config);
	const cursorFollow = new CursorFollowService(
		viewHost,
		config,
		(options) => runPeakUnderstand(viewHost, options),
	);

	viewHost.setPanelOpenListener((open) => {
		if (open) {
			cursorFollow.start();
		} else {
			cursorFollow.stop();
		}
	});

	context.subscriptions.push(
		{ dispose: () => viewHost.dispose() },
		{ dispose: () => cursorFollow.dispose() },
	);

	const disposable = vscode.commands.registerCommand("peak.understand", () =>
		runPeakUnderstand(viewHost),
	);
	context.subscriptions.push(disposable);
}

export function deactivate() {}
