import type { CursorContext, PeakViewHost, PeakViewTab } from "./ports";

/**
 * Future host for true inline Peak view via proposed `editorInsets` API.
 *
 * VS Code issue: https://github.com/microsoft/vscode/issues/85682
 * Proposed API flag: `editorInsets` (Insiders only; not stable for marketplace v1).
 *
 * When the API stabilizes, implement PeakViewHost here:
 * - createEditorInset(webview, line, height, ...) anchored at the trigger line
 * - reuse the same postMessage protocol as WebviewPeakViewHost
 * - swap wiring in extension.ts: `new EditorInsetPeakViewHost(context)` instead of WebviewPeakViewHost
 */
export class EditorInsetPeakViewHost implements PeakViewHost {
	show(
		_tabs: PeakViewTab[],
		_activeTabId: string,
		_cursorContext?: CursorContext,
	): Promise<void> {
		throw new Error(
			"EditorInsetPeakViewHost is not implemented — use WebviewPeakViewHost until editorInsets API is stable.",
		);
	}

	isOpen(): boolean {
		return false;
	}

	setPanelOpenListener(_listener: ((open: boolean) => void) | undefined): void {
		// no-op stub
	}

	dispose(): void {
		// no-op stub
	}
}
