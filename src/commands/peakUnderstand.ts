import * as vscode from "vscode";
import { createCallHierarchyPort } from "../adapters/vscodeCallHierarchy";
import { createDefinitionPort } from "../adapters/vscodeDefinitionSnippet";
import { createDependencyGraphPort } from "../adapters/vscodeDependencyGraph";
import { createImplementationGraphPort } from "../adapters/vscodeImplementationGraph";
import { createLanguageCommands } from "../adapters/vscodeLanguageCommands";
import { createReferenceGraphPort } from "../adapters/vscodeReferenceGraph";
import { createTypeHierarchyPort } from "../adapters/vscodeTypeHierarchy";
import type { PeakViewHost } from "../adapters/ports";
import { buildCursorContext } from "../adapters/cursorContext";
import { UnderstandService } from "../services/understandService";

export async function runPeakUnderstand(
	viewHost: PeakViewHost,
	options?: { quiet?: boolean },
): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		if (!options?.quiet) {
			void vscode.window.showWarningMessage(
				"Peak: open a file and place the cursor on a symbol.",
			);
		}
		return;
	}

	const { document, selection } = editor;
	const position = selection.active;
	const commands = createLanguageCommands();

	const service = new UnderstandService(
		createCallHierarchyPort(),
		createTypeHierarchyPort(commands),
		createReferenceGraphPort(commands),
		createImplementationGraphPort(commands),
		createDefinitionPort(commands),
		createDependencyGraphPort(commands),
		viewHost,
	);

	const warnings = await service.run(
		{
			uri: document.uri.toString(),
			line: position.line,
			character: position.character,
		},
		options,
		await buildCursorContext(
			commands,
			document.uri.toString(),
			position.line,
			position.character,
		),
	);

	if (!options?.quiet) {
		for (const warning of warnings) {
			void vscode.window.showWarningMessage(`Peak: ${warning}`);
		}
	}
}
