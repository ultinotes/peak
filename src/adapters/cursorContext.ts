import type { NamespacePath } from "../domain/symbol";
import type { CursorContext, LanguageCommandsPort } from "./ports";
import { enclosingSymbolPath } from "./symbolAtPosition";

export type NamespaceForUri = (uri: string) => NamespacePath;

let defaultNamespaceForUri: NamespaceForUri | undefined;

function getDefaultNamespaceForUri(): NamespaceForUri {
	if (!defaultNamespaceForUri) {
		const { namespaceForUriString } =
			require("./namespacePath") as typeof import("./namespacePath");
		defaultNamespaceForUri = namespaceForUriString;
	}
	return defaultNamespaceForUri;
}

/** Workspace-relative folder parts + filename (ADR-0007). */
export function fileSegmentsFromUri(
	uri: string,
	namespaceForUri: NamespaceForUri = getDefaultNamespaceForUri(),
): string[] {
	const ns = namespaceForUri(uri);
	const parts =
		ns.folder === "."
			? []
			: ns.folder.split("/").filter((p) => p.length > 0);
	return [...parts, ns.file];
}

export async function buildCursorContext(
	commands: LanguageCommandsPort,
	uri: string,
	line: number,
	character: number,
): Promise<CursorContext> {
	const symbols = await commands.executeDocumentSymbolProvider(uri);
	return {
		fileSegments: fileSegmentsFromUri(uri),
		symbolSegments: enclosingSymbolPath(symbols, line, character),
	};
}
