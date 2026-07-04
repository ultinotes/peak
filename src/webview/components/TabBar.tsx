import { TAB_ICONS } from "../icons";
import { LucideIcon } from "./LucideIcon";
import type { PeakViewTab } from "../../shared/webviewProtocol";

type Props = {
	tabs: PeakViewTab[];
	activeTabId: string;
	onSelect: (id: string) => void;
};

export function TabBar({ tabs, activeTabId, onSelect }: Props) {
	return (
		<header class="tab-bar">
			<div class="tabs">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						class={`tab${tab.id === activeTabId ? " active" : ""}`}
						onClick={() => onSelect(tab.id)}
					>
						{TAB_ICONS[tab.id] ? (
							<LucideIcon icon={TAB_ICONS[tab.id]} size={14} />
						) : null}
						{tab.label}
					</button>
				))}
			</div>
		</header>
	);
}
