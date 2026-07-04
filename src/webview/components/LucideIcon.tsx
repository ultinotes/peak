import { useEffect, useRef } from "preact/hooks";
import { renderIcon, type LucideIcon } from "../icons";

export function LucideIcon({
	icon,
	size = 16,
}: {
	icon: LucideIcon;
	size?: number;
}) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		ref.current?.replaceChildren(renderIcon(icon, size));
	}, [icon, size]);

	return <span ref={ref} style={{ display: "inline-flex" }} />;
}
