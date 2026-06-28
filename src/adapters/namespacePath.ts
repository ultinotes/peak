import * as vscode from "vscode";
import type { NamespacePath } from "../domain/symbol";
import { namespacePathFromUri } from "../domain/symbol";

function workspaceFolderPaths(): string[] {
	return (
		vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? []
	);
}

export function namespaceForUri(uri: vscode.Uri): NamespacePath {
	return namespacePathFromUri(uri.toString(), workspaceFolderPaths());
}

export function namespaceForUriString(uri: string): NamespacePath {
	return namespacePathFromUri(uri, workspaceFolderPaths());
}
