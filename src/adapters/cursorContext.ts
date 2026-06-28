import type { CursorContext, LanguageCommandsPort } from "./ports";
import { namespaceForUriString } from "./namespacePath";
import { enclosingSymbolPath } from "./symbolAtPosition";

/** Workspace-relative folder parts + filename (ADR-0007). */
export function fileSegmentsFromUri(uri: string): string[] {
	const ns = namespaceForUriString(uri);
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
