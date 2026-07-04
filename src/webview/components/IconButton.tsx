import { useEffect, useRef } from "preact/hooks";
import { renderIcon, type LucideIcon } from "../icons";

type Props = {
	icon: LucideIcon;
	label: string;
	size?: number;
	className?: string;
	disabled?: boolean;
	hidden?: boolean;
	onClick?: () => void;
	id?: string;
};

export function IconButton({
	icon,
	label,
	size = 16,
	className = "icon-btn",
	disabled,
	hidden,
	onClick,
	id,
}: Props) {
	const ref = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const btn = ref.current;
		if (!btn) {
			return;
		}
		btn.replaceChildren(renderIcon(icon, size));
		btn.setAttribute("title", label);
		btn.setAttribute("aria-label", label);
	}, [icon, label, size]);

	return (
		<button
			ref={ref}
			id={id}
			type="button"
			class={`${className}${hidden ? " hidden" : ""}`}
			disabled={disabled}
			onClick={onClick}
		/>
	);
}
