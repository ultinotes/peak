import * as vscode from "vscode";
import type { PeakConfigurationPort, PeakViewHost } from "../adapters/ports";

/** Assumption (ADR-0004): debounce cursor follow to limit LSP traffic. */
const CURSOR_FOLLOW_DEBOUNCE_MS = 300;

export type PeakUnderstandRunner = (options?: { quiet?: boolean }) => Promise<void>;

export class CursorFollowService {
	private disposable: vscode.Disposable | undefined;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private lastPositionKey = "";

	constructor(
		private readonly viewHost: PeakViewHost,
		private readonly config: PeakConfigurationPort,
		private readonly runUnderstand: PeakUnderstandRunner,
	) {}

	start(): void {
		if (this.disposable) {
			return;
		}
		this.disposable = vscode.window.onDidChangeTextEditorSelection((event) => {
			if (!this.viewHost.isOpen() || !this.config.updateOnCursorMove()) {
				return;
			}
			const editor = event.textEditor;
			const pos = editor.selection.active;
			const key = `${editor.document.uri.toString()}:${pos.line}:${pos.character}`;
			if (key === this.lastPositionKey) {
				return;
			}
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}
			this.debounceTimer = setTimeout(() => {
				this.lastPositionKey = key;
				void this.runUnderstand({ quiet: true });
			}, CURSOR_FOLLOW_DEBOUNCE_MS);
		});
	}

	stop(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}
		this.disposable?.dispose();
		this.disposable = undefined;
		this.lastPositionKey = "";
	}

	dispose(): void {
		this.stop();
	}
}
