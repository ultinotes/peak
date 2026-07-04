import type { WebviewState } from "../shared/webviewProtocol";

declare function acquireVsCodeApi(): {
	postMessage(message: unknown): void;
	getState(): WebviewState | undefined;
	setState(state: WebviewState): void;
};

export const vscode = acquireVsCodeApi();

export function getWebviewState(): WebviewState | undefined {
	return vscode.getState();
}

export function persistWebviewState(state: WebviewState): void {
	vscode.setState(state);
}
