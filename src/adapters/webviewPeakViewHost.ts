import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { CursorContext, PeakConfigurationPort, PeakViewHost, PeakViewTab } from "./ports";

const PANEL_VIEW_TYPE = "peak.understand";

interface WebviewToExtensionMessage {
	type: "copy" | "modalOpen" | "modalClose";
	mermaid?: string;
}

function isWebviewMessage(msg: unknown): msg is WebviewToExtensionMessage {
	if (typeof msg !== "object" || msg === null) {
		return false;
	}
	const m = msg as Record<string, unknown>;
	if (m.type === "copy") {
		return typeof m.mermaid === "string";
	}
	return m.type === "modalOpen" || m.type === "modalClose";
}

export class WebviewPeakViewHost implements PeakViewHost {
	private panel: vscode.WebviewPanel | undefined;
	private readonly nonce: string;
	private panelOpenListener: ((open: boolean) => void) | undefined;
	private editorMaximizedByPeak = false;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly config: PeakConfigurationPort,
	) {
		this.nonce = crypto.randomBytes(16).toString("hex");
	}

	setPanelOpenListener(listener: ((open: boolean) => void) | undefined): void {
		this.panelOpenListener = listener;
	}

	isOpen(): boolean {
		return this.panel !== undefined;
	}

	async show(
		tabs: PeakViewTab[],
		activeTabId: string,
		cursorContext?: CursorContext,
	): Promise<void> {
		if (!this.panel) {
			// Assumption (ADR-0005): open beside source like markdown preview — no layout commands.
			this.panel = vscode.window.createWebviewPanel(
				PANEL_VIEW_TYPE,
				"Peak understand",
				{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
					],
				},
			);
			this.panel.webview.html = this.buildHtml(this.panel.webview);
			this.panel.onDidDispose(() => {
				void this.restoreEditorIfMaximized();
				this.panel = undefined;
				this.panelOpenListener?.(false);
			});
			this.panel.webview.onDidReceiveMessage(async (msg: unknown) => {
				if (!isWebviewMessage(msg)) {
					return;
				}
				if (msg.type === "copy") {
					await vscode.env.clipboard.writeText(msg.mermaid ?? "");
					void vscode.window.showInformationMessage(
						"Peak: Mermaid diagram copied to clipboard.",
					);
					return;
				}
				if (msg.type === "modalOpen") {
					await this.maximizeEditorForModal();
					return;
				}
				if (msg.type === "modalClose") {
					await this.restoreEditorIfMaximized();
				}
			});
			this.panelOpenListener?.(true);
		} else {
			this.panel.reveal(undefined, true);
		}

		const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
		await this.panel.webview.postMessage({
			type: "update",
			activeTab: activeTabId,
			tabs,
			cursorContext,
			definitionPreviewPlacement: this.config.definitionPreviewPlacement(),
			definitionSnippet: activeTab?.definitionSnippet,
			definitionLocation: activeTab?.definitionLocation,
			definitionSnippetHighlights: activeTab?.definitionSnippetHighlights,
		});
	}

	dispose(): void {
		this.panel?.dispose();
		this.panel = undefined;
	}

	private async maximizeEditorForModal(): Promise<void> {
		if (this.editorMaximizedByPeak) {
			return;
		}
		try {
			await vscode.commands.executeCommand("workbench.action.maximizeEditor");
			this.editorMaximizedByPeak = true;
		} catch {
			// Assumption (ADR-0006): placement commands are best-effort.
		}
	}

	private async restoreEditorIfMaximized(): Promise<void> {
		if (!this.editorMaximizedByPeak) {
			return;
		}
		this.editorMaximizedByPeak = false;
		try {
			await vscode.commands.executeCommand("workbench.action.unmaximizeEditor");
		} catch {
			// Assumption (ADR-0006): placement commands are best-effort.
		}
	}

	private buildHtml(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "peakView.js"),
		);
		const htmlPath = path.join(
			this.extensionUri.fsPath,
			"dist",
			"webview",
			"peakView.html",
		);
		const template = fs.readFileSync(htmlPath, "utf8");
		return template
			.replace(/\{\{nonce\}\}/g, this.nonce)
			.replace(/\{\{cspSource\}\}/g, webview.cspSource)
			.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
	}
}

export function createWebviewPeakViewHost(
	extensionUri: vscode.Uri,
	config: PeakConfigurationPort,
): PeakViewHost {
	return new WebviewPeakViewHost(extensionUri, config);
}
