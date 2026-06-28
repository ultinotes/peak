import type {
	CallHierarchyGraph,
	DefinitionView,
	DependencyGraph,
	HighlightSpan,
	ImplementationGraph,
	ReferenceGraph,
	TypeHierarchyGraph,
} from "../domain/symbol";

export type DefinitionPreviewPlacement = "bottom" | "right";

export interface CallHierarchyItemDto {
	name: string;
	detail?: string;
	uri: string;
	range: RangeDto;
	selectionRange: RangeDto;
}

export interface CallHierarchyIncomingCallDto {
	from: CallHierarchyItemDto;
	fromRanges: RangeDto[];
}

export interface CallHierarchyOutgoingCallDto {
	to: CallHierarchyItemDto;
	fromRanges: RangeDto[];
}

export interface TypeHierarchyItemDto {
	name: string;
	detail?: string;
	uri: string;
	range: RangeDto;
	selectionRange: RangeDto;
}

export interface DocumentLinkDto {
	range: RangeDto;
	targetUri: string;
}

export interface DocumentSymbolDto {
	name: string;
	detail?: string;
	kind: number;
	range: RangeDto;
	selectionRange: RangeDto;
	children?: DocumentSymbolDto[];
}

export interface LocationDto {
	uri: string;
	range: RangeDto;
}

export interface RangeDto {
	startLine: number;
	startCharacter: number;
	endLine: number;
	endCharacter: number;
}

export interface SemanticTokensDto {
	data: Uint32Array;
}

export interface SemanticTokensLegendDto {
	tokenTypes: string[];
	tokenModifiers: string[];
}

export interface LanguageCommandsPort {
	prepareCallHierarchy(
		uri: string,
		line: number,
		character: number,
	): Promise<CallHierarchyItemDto[]>;
	provideIncomingCalls(
		item: CallHierarchyItemDto,
	): Promise<CallHierarchyIncomingCallDto[]>;
	provideOutgoingCalls(
		item: CallHierarchyItemDto,
	): Promise<CallHierarchyOutgoingCallDto[]>;
	prepareTypeHierarchy(
		uri: string,
		line: number,
		character: number,
	): Promise<TypeHierarchyItemDto[]>;
	provideSupertypes(item: TypeHierarchyItemDto): Promise<TypeHierarchyItemDto[]>;
	provideSubtypes(item: TypeHierarchyItemDto): Promise<TypeHierarchyItemDto[]>;
	executeDocumentSymbolProvider(uri: string): Promise<DocumentSymbolDto[]>;
	executeDocumentLinkProvider(uri: string): Promise<DocumentLinkDto[]>;
	executeDefinitionProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]>;
	executeTypeDefinitionProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]>;
	executeImplementationProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]>;
	executeReferenceProvider(
		uri: string,
		line: number,
		character: number,
	): Promise<LocationDto[]>;
	executeDocumentRangeSemanticTokensProvider(
		uri: string,
		range: RangeDto,
	): Promise<SemanticTokensDto | null>;
	provideDocumentSemanticTokensLegend(
		uri: string,
		range?: RangeDto,
	): Promise<SemanticTokensLegendDto | null>;
}

export interface CallHierarchyPort {
	buildDirectedGraph(
		uri: string,
		line: number,
		character: number,
		direction: "in" | "out",
		fallbackLabel: string,
	): Promise<CallHierarchyGraph | null>;
}

export interface TypeHierarchyPort {
	buildGraph(
		uri: string,
		line: number,
		character: number,
		fallbackLabel: string,
	): Promise<TypeHierarchyGraph | null>;
}

export interface DefinitionPort {
	fetchDefinition(
		uri: string,
		line: number,
		character: number,
	): Promise<DefinitionView | null>;
}

export interface DependencyGraphPort {
	buildGraph(uri: string): Promise<DependencyGraph>;
}

export interface ReferenceGraphPort {
	buildGraph(
		uri: string,
		line: number,
		character: number,
	): Promise<ReferenceGraph | null>;
}

export interface ImplementationGraphPort {
	buildGraph(
		uri: string,
		line: number,
		character: number,
	): Promise<ImplementationGraph | null>;
}

export interface PeakConfigurationPort {
	updateOnCursorMove(): boolean;
	definitionPreviewPlacement(): DefinitionPreviewPlacement;
}

export interface CursorContext {
	fileSegments: string[];
	symbolSegments: string[];
}

export interface PeakViewTab {
	id: string;
	label: string;
	mermaid: string;
	focusedNodeId?: string;
	definitionSnippet?: string;
	definitionLocation?: string;
	definitionSnippetHighlights?: HighlightSpan[];
}

export interface PeakViewHost {
	show(
		tabs: PeakViewTab[],
		activeTabId: string,
		cursorContext?: CursorContext,
	): Promise<void>;
	isOpen(): boolean;
	setPanelOpenListener(listener: ((open: boolean) => void) | undefined): void;
	dispose(): void;
}

export interface UnderstandResult {
	tabs: PeakViewTab[];
	warnings: string[];
	activeTabId: string;
}
