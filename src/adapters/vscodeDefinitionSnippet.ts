import * as vscode from "vscode";
import type { DefinitionPort, LanguageCommandsPort } from "./ports";
import { decodeSemanticTokens } from "../domain/semanticHighlight";
import type { DefinitionView, RangeDto } from "../domain/symbol";
import {
	DEFINITION_SNIPPET_CONTEXT_LINES,
	extractSnippet,
	fileBasename,
} from "../domain/symbol";

function snippetRange(
	lines: string[],
	range: RangeDto,
	contextLines: number,
): RangeDto {
	const startLine = Math.max(0, range.startLine - contextLines);
	const endLine = Math.min(lines.length - 1, range.endLine + contextLines);
	return {
		startLine,
		startCharacter: 0,
		endLine,
		endCharacter: lines[endLine]?.length ?? 0,
	};
}

export class VscodeDefinitionSnippet implements DefinitionPort {
	constructor(private readonly commands: LanguageCommandsPort) {}

	async fetchDefinition(
		uri: string,
		line: number,
		character: number,
	): Promise<DefinitionView | null> {
		let locations = await this.commands.executeDefinitionProvider(
			uri,
			line,
			character,
		);
		if (!locations.length) {
			locations = await this.commands.executeTypeDefinitionProvider(
				uri,
				line,
				character,
			);
		}
		if (!locations.length) {
			return null;
		}

		const loc = locations.find((l) =>
			vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(l.uri)),
		) ?? locations[0];

		const targetUri = vscode.Uri.parse(loc.uri);
		const bytes = await vscode.workspace.fs.readFile(targetUri);
		const text = new TextDecoder("utf-8").decode(bytes);
		const lines = text.split(/\r?\n/);
		const snippet = extractSnippet(lines, loc.range, DEFINITION_SNIPPET_CONTEXT_LINES);
		const snippetStartLine = Math.max(
			0,
			loc.range.startLine - DEFINITION_SNIPPET_CONTEXT_LINES,
		);
		const basename = fileBasename(loc.uri);
		const location = `${basename}:${loc.range.startLine + 1}`;

		const highlights = await this.fetchSnippetHighlights(
			loc.uri,
			lines,
			loc.range,
			snippetStartLine,
			snippet,
		);

		return {
			label: "Definition",
			location,
			snippet,
			snippetHighlights: highlights,
		};
	}

	private async fetchSnippetHighlights(
		uri: string,
		lines: string[],
		definitionRange: RangeDto,
		snippetStartLine: number,
		snippet: string,
	): Promise<DefinitionView["snippetHighlights"]> {
		const range = snippetRange(lines, definitionRange, DEFINITION_SNIPPET_CONTEXT_LINES);
		const [tokens, legend] = await Promise.all([
			this.commands.executeDocumentRangeSemanticTokensProvider(uri, range),
			this.commands.provideDocumentSemanticTokensLegend(uri, range),
		]);
		if (!tokens || !legend) {
			return undefined;
		}
		const spans = decodeSemanticTokens(
			tokens.data,
			legend,
			range,
			snippetStartLine,
			snippet,
		);
		return spans.length > 0 ? spans : undefined;
	}
}

export function createDefinitionPort(
	commands: LanguageCommandsPort,
): DefinitionPort {
	return new VscodeDefinitionSnippet(commands);
}
