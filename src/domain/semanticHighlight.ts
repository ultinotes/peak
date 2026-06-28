import type { HighlightSpan, RangeDto } from "./symbol";

export interface SemanticTokensLegendDto {
	tokenTypes: string[];
	tokenModifiers: string[];
}

function offsetInSnippet(
	snippetStartLine: number,
	snippet: string,
	line: number,
	char: number,
): number {
	const snippetLines = snippet.split("\n");
	const relLine = line - snippetStartLine;
	if (relLine < 0 || relLine >= snippetLines.length) {
		return -1;
	}
	let offset = 0;
	for (let i = 0; i < relLine; i++) {
		offset += snippetLines[i].length + 1;
	}
	offset += char;
	return offset;
}

function modifiersFromBitset(
	bitset: number,
	legend: SemanticTokensLegendDto,
): string[] {
	const modifiers: string[] = [];
	for (let i = 0; i < legend.tokenModifiers.length; i++) {
		if (bitset & (1 << i)) {
			modifiers.push(legend.tokenModifiers[i]);
		}
	}
	return modifiers;
}

/** Decode LSP semantic tokens into snippet-relative highlight spans. */
export function decodeSemanticTokens(
	data: Uint32Array,
	legend: SemanticTokensLegendDto,
	_rangeStart: RangeDto,
	snippetStartLine: number,
	snippet: string,
): HighlightSpan[] {
	const spans: HighlightSpan[] = [];
	// Assumption: VS Code semantic token deltas are encoded from document (0, 0).
	let line = 0;
	let char = 0;
	let cursor = 0;

	for (let i = 0; i < data.length; i += 5) {
		const deltaLine = data[i];
		const deltaStart = data[i + 1];
		const length = data[i + 2];
		const tokenTypeIndex = data[i + 3];
		const tokenModifiersBitset = data[i + 4];

		if (deltaLine === 0) {
			char += deltaStart;
		} else {
			line += deltaLine;
			char = deltaStart;
		}

		const tokenType = legend.tokenTypes[tokenTypeIndex] ?? "other";
		const modifiers = modifiersFromBitset(tokenModifiersBitset, legend);
		const start = offsetInSnippet(snippetStartLine, snippet, line, char);
		if (start < 0 || start + length > snippet.length) {
			continue;
		}
		if (start < cursor) {
			continue;
		}
		spans.push({
			start,
			length,
			tokenType,
			modifiers: modifiers.length > 0 ? modifiers : undefined,
		});
		cursor = start + length;
	}

	return spans;
}
