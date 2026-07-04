import type { CursorContext } from "../../shared/webviewProtocol";

export function CursorBreadcrumb({ context }: { context?: CursorContext }) {
	const segments = context
		? [...context.fileSegments, ...context.symbolSegments]
		: [];

	return (
		<nav
			id="cursorBreadcrumb"
			class="cursor-breadcrumb"
			aria-label="Current symbol"
		>
			{segments.map((text, i) => (
				<span key={`${i}-${text}`}>
					{i > 0 ? (
						<span class="cursor-breadcrumb-sep" aria-hidden="true">
							›
						</span>
					) : null}
					<span
						class={`cursor-breadcrumb-segment${
							i === segments.length - 1 ? " focus" : ""
						}`}
					>
						{text}
					</span>
				</span>
			))}
		</nav>
	);
}
