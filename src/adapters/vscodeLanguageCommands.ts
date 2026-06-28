import * as vscode from "vscode";
import type {
	CallHierarchyIncomingCallDto,
	CallHierarchyItemDto,
	CallHierarchyOutgoingCallDto,
	DocumentLinkDto,
	DocumentSymbolDto,
	LanguageCommandsPort,
	LocationDto,
	SemanticTokensDto,
	SemanticTokensLegendDto,
	TypeHierarchyItemDto,
} from "./ports";
import type { RangeDto } from "../domain/symbol";

function toRange(r: vscode.Range): RangeDto {
	return {
		startLine: r.start.line,
		startCharacter: r.start.character,
		endLine: r.end.line,
		endCharacter: r.end.character,
	};
}

function toCallItem(item: vscode.CallHierarchyItem): CallHierarchyItemDto {
	return {
		name: item.name,
		detail: item.detail,
		uri: item.uri.toString(),
		range: toRange(item.range),
		selectionRange: toRange(item.selectionRange),
	};
}

function toTypeItem(item: vscode.TypeHierarchyItem): TypeHierarchyItemDto {
	return {
		name: item.name,
		detail: item.detail,
		uri: item.uri.toString(),
		range: toRange(item.range),
		selectionRange: toRange(item.selectionRange),
	};
}

function toDocumentSymbol(s: vscode.DocumentSymbol): DocumentSymbolDto {
	return {
		name: s.name,
		detail: s.detail,
		kind: s.kind,
		range: toRange(s.range),
		selectionRange: toRange(s.selectionRange),
		children: s.children?.map(toDocumentSymbol),
	};
}

function toLocation(loc: vscode.Location): LocationDto {
	return { uri: loc.uri.toString(), range: toRange(loc.range) };
}

export class VscodeLanguageCommands implements LanguageCommandsPort {
	async prepareCallHierarchy(
		uri: string,
		line: number,
		character: number,
	): Promise<CallHierarchyItemDto[]> {
		const items = await vscode.commands.executeCommand<
			vscode.CallHierarchyItem[]
		>("vscode.prepareCallHierarchy", vscode.Uri.parse(uri), new vscode.Position(line, character));
		return (items ?? []).map(toCallItem);
	}

	async provideIncomingCalls(
		item: CallHierarchyItemDto,
	): Promise<CallHierarchyIncomingCallDto[]> {
		const vscodeItem = this.toVscodeCallItem(item);
		const calls = await vscode.commands.executeCommand<
			vscode.CallHierarchyIncomingCall[]
		>("vscode.provideIncomingCalls", vscodeItem);
		return (calls ?? []).map((c) => ({
			from: toCallItem(c.from),
			fromRanges: c.fromRanges.map(toRange),
		}));
	}

	async provideOutgoingCalls(
		item: CallHierarchyItemDto,
	): Promise<CallHierarchyOutgoingCallDto[]> {
		const vscodeItem = this.toVscodeCallItem(item);
		const calls = await vscode.commands.executeCommand<
			vscode.CallHierarchyOutgoingCall[]
		>("vscode.provideOutgoingCalls", vscodeItem);
		return (calls ?? []).map((c) => ({
			to: toCallItem(c.to),
			fromRanges: c.fromRanges.map(toRange),
		}));
	}

	async prepareTypeHierarchy(
		uri: string,
		line: number,
		character: number,
	): Promise<TypeHierarchyItemDto[]> {
		const items = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>("vscode.prepareTypeHierarchy", vscode.Uri.parse(uri), new vscode.Position(line, character));
		return (items ?? []).map(toTypeItem);
	}

	async provideSupertypes(
		item: TypeHierarchyItemDto,
	): Promise<TypeHierarchyItemDto[]> {
		const vscodeItem = this.toVscodeTypeItem(item);
		const items = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>("vscode.provideSupertypes", vscodeItem);
		return (items ?? []).map(toTypeItem);
	}

	async provideSubtypes(
		item: TypeHierarchyItemDto,
	): Promise<TypeHierarchyItemDto[]> {
		const vscodeItem = this.toVscodeTypeItem(item);
		const items = await vscode.commands.executeCommand<
			vscode.TypeHierarchyItem[]
		>("vscode.provideSubtypes", vscodeItem);
		return (items ?? []).map(toTypeItem);
	}

	async 	executeDocumentSymbolProvider(
		uri: string,
	): Promise<DocumentSymbolDto[]> {
		const symbols = await vscode.commands.executeCommand<
			vscode.DocumentSymbol[]
		>("vscode.executeDocumentSymbolProvider", vscode.Uri.parse(uri));
		return (symbols ?? []).map(toDocumentSymbol);
	}

	async executeDocumentLinkProvider(uri: string): Promise<DocumentLinkDto[]> {
		try {
			const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
				"vscode.executeDocumentLinkProvider",
				vscode.Uri.parse(uri),
			);
			return (links ?? [])
				.filter((link) => link.target)
				.map((link) => ({
					range: toRange(link.range),
					targetUri: link.target!.toString(),
				}));
		} catch {
			return [];
		}
	}

	async executeDefinitionProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]> {
		const locations = await vscode.commands.executeCommand<
			vscode.LocationLink[] | vscode.Location[]
		>(
			"vscode.executeDefinitionProvider",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		return flattenLocations(locations);
	}

	async executeTypeDefinitionProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]> {
		const locations = await vscode.commands.executeCommand<
			vscode.LocationLink[] | vscode.Location[]
		>(
			"vscode.executeTypeDefinitionProvider",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		return flattenLocations(locations);
	}

	async executeImplementationProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]> {
		const locations = await vscode.commands.executeCommand<
			vscode.LocationLink[] | vscode.Location[]
		>(
			"vscode.executeImplementationProvider",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		return flattenLocations(locations);
	}

	async executeReferenceProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]> {
		const locations = await vscode.commands.executeCommand<
			vscode.LocationLink[] | vscode.Location[]
		>(
			"vscode.executeReferenceProvider",
			vscode.Uri.parse(uri),
			new vscode.Position(line, character),
		);
		return flattenLocations(locations);
	}

	async executeDocumentRangeSemanticTokensProvider(
		uri: string,
		range: RangeDto,
	): Promise<SemanticTokensDto | null> {
		const parsedUri = vscode.Uri.parse(uri);
		const vscodeRange = new vscode.Range(
			range.startLine,
			range.startCharacter,
			range.endLine,
			range.endCharacter,
		);
		try {
			// Assumption: semantic token commands require the document in the extension host.
			await vscode.workspace.openTextDocument(parsedUri);
			const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
				"vscode.provideDocumentRangeSemanticTokens",
				parsedUri,
				vscodeRange,
			);
			if (!tokens?.data) {
				return null;
			}
			return { data: tokens.data };
		} catch {
			return null;
		}
	}

	async provideDocumentSemanticTokensLegend(
		uri: string,
		range?: RangeDto,
	): Promise<SemanticTokensLegendDto | null> {
		const parsedUri = vscode.Uri.parse(uri);
		try {
			await vscode.workspace.openTextDocument(parsedUri);
			const legend = range
				? await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
						"vscode.provideDocumentRangeSemanticTokensLegend",
						parsedUri,
						new vscode.Range(
							range.startLine,
							range.startCharacter,
							range.endLine,
							range.endCharacter,
						),
					)
				: await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
						"vscode.provideDocumentSemanticTokensLegend",
						parsedUri,
					);
			if (!legend) {
				return null;
			}
			return {
				tokenTypes: legend.tokenTypes,
				tokenModifiers: legend.tokenModifiers,
			};
		} catch {
			return null;
		}
	}

	private toVscodeCallItem(item: CallHierarchyItemDto): vscode.CallHierarchyItem {
		return new vscode.CallHierarchyItem(
			vscode.SymbolKind.Function,
			item.name,
			item.detail ?? "",
			vscode.Uri.parse(item.uri),
			new vscode.Range(
				item.range.startLine,
				item.range.startCharacter,
				item.range.endLine,
				item.range.endCharacter,
			),
			new vscode.Range(
				item.selectionRange.startLine,
				item.selectionRange.startCharacter,
				item.selectionRange.endLine,
				item.selectionRange.endCharacter,
			),
		);
	}

	private toVscodeTypeItem(item: TypeHierarchyItemDto): vscode.TypeHierarchyItem {
		return new vscode.TypeHierarchyItem(
			vscode.SymbolKind.Class,
			item.name,
			item.detail ?? "",
			vscode.Uri.parse(item.uri),
			new vscode.Range(
				item.range.startLine,
				item.range.startCharacter,
				item.range.endLine,
				item.range.endCharacter,
			),
			new vscode.Range(
				item.selectionRange.startLine,
				item.selectionRange.startCharacter,
				item.selectionRange.endLine,
				item.selectionRange.endCharacter,
			),
		);
	}
}

function flattenLocations(
	locations: vscode.LocationLink[] | vscode.Location[] | undefined,
): LocationDto[] {
	if (!locations?.length) {
		return [];
	}
	if (locations[0] instanceof vscode.Location) {
		return (locations as vscode.Location[]).map(toLocation);
	}
	return (locations as vscode.LocationLink[]).map((link) => ({
		uri: link.targetUri.toString(),
		range: toRange(link.targetRange),
	}));
}

export function createLanguageCommands(): LanguageCommandsPort {
	return new VscodeLanguageCommands();
}
