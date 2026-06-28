import type { DocumentSymbolDto, LocationDto } from "./ports";
import type { RangeDto } from "../domain/symbol";
import { fileBasename, nodeId } from "../domain/symbol";

function containsPosition(
	range: RangeDto,
	line: number,
	character: number,
): boolean {
	if (line < range.startLine || line > range.endLine) {
		return false;
	}
	if (line === range.startLine && character < range.startCharacter) {
		return false;
	}
	if (line === range.endLine && character > range.endCharacter) {
		return false;
	}
	return true;
}

export function enclosingSymbolName(
	symbols: DocumentSymbolDto[],
	line: number,
	character: number,
): string | undefined {
	const path = enclosingSymbolPath(symbols, line, character);
	return path.length > 0 ? path[path.length - 1] : undefined;
}

/** Outermost → innermost document symbols containing the cursor (ADR-0007). */
export function enclosingSymbolPath(
	symbols: DocumentSymbolDto[],
	line: number,
	character: number,
): string[] {
	const result: string[] = [];
	const walk = (list: DocumentSymbolDto[]): boolean => {
		for (const sym of list) {
			if (!containsPosition(sym.range, line, character)) {
				continue;
			}
			result.push(sym.name);
			if (sym.children?.length && walk(sym.children)) {
				return true;
			}
			return true;
		}
		return false;
	};
	walk(symbols);
	return result;
}

export function locationNodeLabel(loc: LocationDto): string {
	return `${fileBasename(loc.uri)}:${loc.range.startLine + 1}`;
}

export function locationNodeId(loc: LocationDto): string {
	return nodeId(loc.uri, locationNodeLabel(loc), loc.range);
}
