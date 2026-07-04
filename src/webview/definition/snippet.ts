import type { HighlightSpan } from "../../domain/symbol";

function tokenClassName(tokenType: string): string {
	return `token-${tokenType.replace(/[^\w-]/g, "-")}`;
}

export function renderHighlightedSnippet(
	body: HTMLElement,
	snippet: string,
	highlights?: HighlightSpan[],
): void {
	body.replaceChildren();
	if (!highlights?.length) {
		body.textContent = snippet;
		return;
	}
	const sorted = [...highlights].sort((a, b) => a.start - b.start);
	let cursor = 0;
	for (const span of sorted) {
		if (span.start < cursor) {
			continue;
		}
		if (span.start > cursor) {
			body.appendChild(
				document.createTextNode(snippet.slice(cursor, span.start)),
			);
		}
		const el = document.createElement("span");
		el.className = tokenClassName(span.tokenType);
		for (const mod of span.modifiers ?? []) {
			el.classList.add(`token-mod-${mod.replace(/[^\w-]/g, "-")}`);
		}
		el.textContent = snippet.slice(span.start, span.start + span.length);
		body.appendChild(el);
		cursor = span.start + span.length;
	}
	if (cursor < snippet.length) {
		body.appendChild(document.createTextNode(snippet.slice(cursor)));
	}
}
