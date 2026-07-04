import { useEffect, useRef } from "preact/hooks";
import { renderHighlightedSnippet } from "../definition/snippet";
import type { PeakViewTab } from "../../shared/webviewProtocol";

type Props = {
	tab: PeakViewTab | undefined;
	visible: boolean;
};

export function DefinitionPanel({ tab, visible }: Props) {
	const bodyRef = useRef<HTMLPreElement>(null);

	useEffect(() => {
		const body = bodyRef.current;
		if (!body || !visible || !tab?.definitionSnippet) {
			return;
		}
		renderHighlightedSnippet(
			body,
			tab.definitionSnippet,
			tab.definitionSnippetHighlights,
		);
	}, [
		visible,
		tab?.definitionSnippet,
		tab?.definitionSnippetHighlights,
	]);

	return (
		<div id="definition" class={visible ? "visible" : ""}>
			<div id="definitionHeader">
				{visible ? (tab?.definitionLocation ?? "Definition") : ""}
			</div>
			<pre id="definitionBody" ref={bodyRef} />
		</div>
	);
}
